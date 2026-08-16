/**
 * @file index.js
 * @description 面向 UI 的翻译服务门面：缓存、批处理与流式分发网关；引擎实现与编排见 ../providers/。
 */

import queryString from "query-string";
import {
  URL_CACHE_TRAN,
  URL_CACHE_DICT,
  URL_CACHE_SUBTITLE,
  URL_CACHE_CONTEXT,
  OPT_LANGS_TO_SPEC,
  OPT_LANGS_SPEC_DEFAULT,
  DEFAULT_API_SETTING,
  OPT_LANGS_TO_CODE,
  defaultNobatchUserPrompt,
  defaultDictUserPrompt,
} from "../config";
import { getProviderCapability } from "../providers";
import { getCacheDigest } from "../libs/cacheDigest";
import {
  handleTranslate,
  handleDict,
  handleSubtitle,
  buildSubtitleSystemPrompt,
  formatIndexSubtitleEvents,
  handleSummarize,
} from "../providers/translation";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { getBatchQueue } from "../libs/batchQueue";
import { getDocInfo } from "../libs/docInfo";

const PROMPT_CACHE_SALT = "prompt-cache";
const PROMPT_CACHE_SCOPE_BATCH = "batch";
const PROMPT_CACHE_SCOPE_NOBATCH = "nobatch";
const PROMPT_CACHE_SCOPE_DICT = "dict";
const PROMPT_CACHE_SCOPE_PLAIN = "plain";

function getTranslatePromptCacheScope(apiSetting = {}) {
  if (!getProviderCapability(apiSetting.apiType, "ai")) {
    return PROMPT_CACHE_SCOPE_PLAIN;
  }

  return apiSetting.useBatchFetch &&
    getProviderCapability(apiSetting.apiType, "batch")
    ? PROMPT_CACHE_SCOPE_BATCH
    : PROMPT_CACHE_SCOPE_NOBATCH;
}

function getPromptCacheFields(apiSetting = {}, promptScope) {
  if (promptScope === PROMPT_CACHE_SCOPE_BATCH) {
    return [apiSetting.systemPrompt || ""];
  }

  if (promptScope === PROMPT_CACHE_SCOPE_NOBATCH) {
    return [
      apiSetting.nobatchPrompt || "",
      apiSetting.nobatchUserPrompt ?? defaultNobatchUserPrompt,
    ];
  }

  if (promptScope === PROMPT_CACHE_SCOPE_DICT) {
    return [
      apiSetting.dictPrompt || "",
      apiSetting.dictUserPrompt ?? defaultDictUserPrompt,
    ];
  }

  return [];
}

async function getPromptCacheSig(apiSetting = {}, promptScope) {
  const promptText = [
    promptScope,
    ...getPromptCacheFields(apiSetting, promptScope),
  ].join("\n");

  return (await getCacheDigest(promptText, PROMPT_CACHE_SALT)).slice(0, 16);
}

/**
 * 全局统一翻译分发控制网关。
 * 承载了翻译缓存命中判断、并发批量队列合并、流式文本输出处理等最核心的工程化细节。
 * @param {Object} params
 * @param {string} params.text 待翻译的原文字符串 (如果是网页翻译，为被分割出的 DOM 文本块)
 * @param {string} params.fromLang 源语言，默认为 "auto"
 * @param {string} params.toLang 目标翻译语言
 * @param {Object} params.apiSetting 翻译接口的配置参数项
 * @param {string} params.glossary 自定义词汇术语替换表
 * @param {Function} params.onStreamChunk 流式响应增量回调函数 (用于 SSE/LLM 翻译)
 * @param {Object} params.docInfo 视频/文档摘要等额外上下文环境数据
 * @param {boolean} params.useCache 是否应用本地请求缓存 (默认 true)
 * @param {boolean} params.usePool 是否应用限制连接池 (默认 true)
 * @param {AbortSignal} params.signal AbortController 传导的取消控制信号
 * @returns {Promise<Object>} 最终解析出的翻译响应数据 (trText, srLang, srCode, isSame)
 */
export const apiTranslate = async ({
  text,
  fromLang = "auto",
  toLang,
  apiSetting = DEFAULT_API_SETTING,
  glossary,
  onStreamChunk,
  docInfo,
  useCache = true,
  usePool = true,
  signal,
}) => {
  if (!text) {
    throw new Error("The text cannot be empty.");
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const { apiType, apiSlug, useBatchFetch } = apiSetting;
  const langMap = OPT_LANGS_TO_SPEC[apiType] || OPT_LANGS_SPEC_DEFAULT;
  const from = langMap.get(fromLang);
  const to = langMap.get(toLang);
  if (!to) {
    throw new Error(`The target lang: ${toLang} not support`);
  }

  // 缓存 Key (cacheOpts) 构造。
  // 特别是将项目的 REACT_APP_VERSION 版本号（仅前两位小版本）加入了缓存 key。
  // 这可以确保用户在升级扩展插件后，旧版本的翻译缓存会被自动作废，防止旧的翻译 Prompt/规则影响新版效果。
  // 此外，如果当前是视频字幕翻译，还会缓存前 50 字符的上下文视频摘要信息，使上下文关联缓存更智能。
  const [v1, v2] = process.env.REACT_APP_VERSION.split(".");
  const promptSig = await getPromptCacheSig(
    apiSetting,
    getTranslatePromptCacheScope(apiSetting)
  );
  const cacheOpts = {
    apiSlug,
    text,
    fromLang,
    toLang,
    version: [v1, v2].join("."),
    promptSig,
    ...(docInfo?.summary && { ctx: docInfo.summary.slice(0, 50) }),
  };
  const cacheInput = `${URL_CACHE_TRAN}?${queryString.stringify(cacheOpts)}`;

  // 1. 查询本地 HTTP/CacheStorage 缓存
  if (useCache) {
    const cache = await getHttpCachePolyfill(cacheInput);
    if (cache?.trText) {
      return cache;
    }
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  // 2. 缓存未命中，分发执行翻译请求
  let translation = [];
  if (useBatchFetch && getProviderCapability(apiType, "batch")) {
    // 2.2 支持批量翻译的传统接口 (如 Google/Microsoft/DeepL 等)
    // 使用 BatchQueue 进行零散文本大合并，节省网络交互次数，大幅提升网页整页翻译的载入速度
    const {
      apiSlug,
      batchInterval,
      batchSize,
      batchLength,
      batchConcurrency,
      useStream,
      useContext,
    } = apiSetting;
    const enableStream = useStream && getProviderCapability(apiType, "stream");
    const configuredBatchConcurrency = Number(batchConcurrency);
    const effectiveBatchConcurrency =
      useContext && getProviderCapability(apiType, "context")
        ? 1
        : Number.isFinite(configuredBatchConcurrency) &&
            configuredBatchConcurrency >= 1
          ? Math.floor(configuredBatchConcurrency)
          : 1;
    const key = `${apiSlug}_${fromLang}_${toLang}_${enableStream ? "stream" : "batch"}_${promptSig}_${effectiveBatchConcurrency}`;
    const queue = getBatchQueue(key, handleTranslate, {
      batchInterval,
      batchSize,
      batchLength,
      batchConcurrency: effectiveBatchConcurrency,
    });

    translation = await queue.addTask(text, {
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      apiSetting,
      usePool,
      onStreamChunk,
      docInfo,
      signal,
    });
  } else {
    // 2.3 不支持批量翻译、需要单个请求执行的 API (如某些流式大模型 API)
    const generator = handleTranslate([text], {
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      apiSetting,
      usePool,
      docInfo,
      onStreamChunk,
      signal,
    });

    for await (const item of generator) {
      if (item.id !== 0) {
        continue;
      }

      const isComplete = item.isComplete !== false;
      if (!isComplete) {
        if (onStreamChunk) {
          onStreamChunk({
            id: item.id,
            text: item.partialText,
            isComplete: false,
          });
        }
        continue;
      }

      if (onStreamChunk) {
        onStreamChunk({
          id: item.id,
          text: item.result,
          isComplete: true,
        });
      }
      translation = item.result;
    }
  }

  // 3. 对翻译引擎返回的数据格式进行规范化处理
  let trText = "";
  let srLang = "";
  let srCode = "";
  if (Array.isArray(translation)) {
    [trText, srLang = ""] = translation;
    if (srLang) {
      srCode = OPT_LANGS_TO_CODE[apiType].get(srLang) || "";
    }
  } else if (typeof translation === "string") {
    trText = translation;
  }

  if (!trText) {
    throw new Error("tanslate api got empty trtext");
  }

  // 判断是否发生了“源语言与目标语言相同”的无效翻译情况 (如英文网页翻译为英文)
  const isSame = fromLang === "auto" && srLang === to;

  // 4. 将成功的结果写入本地网络缓存中
  if (useCache) {
    putHttpCachePolyfill(cacheInput, null, { trText, isSame, srLang, srCode });
  }

  return { trText, srLang, srCode, isSame };
};

/**
 * AI 词典查询入口。
 *
 * 该函数负责完成参数校验、语言名映射、缓存 Key 构造与上下文签名计算，
 * 真正的模型请求由 `handleDict` 处理，避免 UI 层直接接触不同 AI 接口差异。
 *
 * @param {Object} params 查询参数
 * @param {string} params.text 待解析的单词、短语或长文本
 * @param {string} [params.fromLang="auto"] 源语言代码
 * @param {string} params.toLang 目标语言代码
 * @param {Object} [params.apiSetting] 已解析出提示词的 API 配置
 * @param {Object} [params.docInfo] 外部传入的页面上下文信息
 * @param {string} [params.context] 当前选区所在段落上下文
 * @param {Function} [params.onStreamChunk] 流式增量 Markdown 回调
 * @param {boolean} [params.useCache=true] 是否读写本地缓存
 * @param {AbortSignal} [params.signal] 取消信号
 * @returns {Promise<string>} AI 词典返回的 Markdown 文本
 */
export const apiDict = async ({
  text,
  fromLang = "auto",
  toLang,
  apiSetting = DEFAULT_API_SETTING,
  docInfo,
  context = "",
  onStreamChunk,
  useCache = true,
  signal,
}) => {
  if (!text) {
    throw new Error("The text cannot be empty.");
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const { apiType } = apiSetting;
  if (!getProviderCapability(apiType, "ai")) {
    throw new Error("AI dictionary only supports AI APIs.");
  }

  // 复用翻译接口的语言规格映射，确保词典提示词中 {{from}}/{{to}} 与该模型兼容。
  const langMap = OPT_LANGS_TO_SPEC[apiType] || OPT_LANGS_SPEC_DEFAULT;
  const from = langMap.get(fromLang);
  const to = langMap.get(toLang);
  if (!to) {
    throw new Error(`The target lang: ${toLang} not support`);
  }

  const [v1, v2] = process.env.REACT_APP_VERSION.split(".");
  const effectiveDocInfo = docInfo || getDocInfo();
  // 缓存需要区分页面信息和选区段落，否则同一个词在不同语境下会错误复用释义。
  const contextSig = await getCacheDigest(
    [
      effectiveDocInfo?.title || "",
      effectiveDocInfo?.description || "",
      effectiveDocInfo?.summary || "",
      context || "",
    ].join("\n"),
    PROMPT_CACHE_SALT
  );
  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    text,
    fromLang,
    toLang,
    version: [v1, v2].join("."),
    promptSig: await getPromptCacheSig(apiSetting, PROMPT_CACHE_SCOPE_DICT),
    contextSig: contextSig.slice(0, 16),
  };
  const cacheInput = `${URL_CACHE_DICT}?${queryString.stringify(cacheOpts)}`;

  if (useCache) {
    const cache = await getHttpCachePolyfill(cacheInput);
    if (cache?.markdown) {
      return cache.markdown;
    }
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const markdown = await handleDict({
    text,
    from,
    to,
    fromLang,
    toLang,
    apiSetting,
    docInfo: effectiveDocInfo,
    context,
    onStreamChunk,
    signal,
  });

  if (useCache) {
    putHttpCachePolyfill(cacheInput, null, { markdown });
  }

  return markdown;
};

/**
 * 专为视频外挂字幕 (Subtitle Segment) 订制的翻译处理函数。
 * 融合了视频上下文摘要，使得大模型字幕翻译语义更加贴合剧情，不会产生传统断句翻译的突兀感。
 * @param {Object} params 包含视频 ID、字幕块标识和当前切片字幕数组等。
 * @param {Function} [params.onSubtitleChunk] 字幕断句流式输出完整句子时触发的增量回调。
 * @param {AbortSignal} [params.signal] 当前字幕处理生命周期的取消信号，会下传到请求层。
 * @returns {Promise<Array<Object>>} 完整字幕断句与翻译结果。
 */
export const apiSubtitle = async ({
  videoId,
  chunkSign,
  fromLang = "auto",
  toLang,
  events = [],
  apiSetting,
  docInfo,
  onSubtitleChunk,
  signal,
}) => {
  if (!events?.length) return [];
  const formattedEvents = formatIndexSubtitleEvents(
    events,
    apiSetting.subtitlePrompt
  );
  // chunk 哈希同时包含 AI 输入和内部时间轴，避免相同首尾时间误命中旧字幕。
  const chunkHash = (
    await getCacheDigest(
      JSON.stringify(
        formattedEvents.map((item, index) => [
          item.id,
          item.text,
          events[index]?.start,
          events[index]?.end,
          // 新协议记录精确停顿；旧提示词仍使用 p 时继续纳入同一哈希槽位。
          item.pauseMs || item.p || 0,
        ])
      ),
      "subtitle-chunk-v4"
    )
  ).slice(0, 16);
  // 对完成变量替换的最终提示词签名，动态视频上下文无需再维护独立 contextSig。
  const renderedPrompt = buildSubtitleSystemPrompt({
    subtitlePrompt: apiSetting.subtitlePrompt,
    tone: apiSetting.tone,
    from: fromLang,
    to: toLang,
    fromLang,
    toLang,
    docInfo,
    aiTerms: apiSetting.aiTerms,
  });
  const cacheOpts = {
    apiSlug: apiSetting.apiSlug,
    apiType: apiSetting.apiType,
    model: apiSetting.model,
    videoId,
    chunkSign,
    chunkHash,
    fromLang,
    toLang,
    segVer: 4,
    promptSig: (await getCacheDigest(renderedPrompt, PROMPT_CACHE_SALT)).slice(
      0,
      16
    ),
  };
  const cacheInput = `${URL_CACHE_SUBTITLE}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取视频字幕缓存
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 发起使用视频级系统上下文的字幕断句与翻译请求。
  const subtitles = await handleSubtitle({
    events,
    from: fromLang,
    to: toLang,
    apiSetting,
    docInfo,
    onSubtitleChunk,
    signal,
  });
  if (subtitles?.length) {
    putHttpCachePolyfill(cacheInput, null, subtitles);
    return subtitles;
  }

  return [];
};

/**
 * 对视频标题、简介和原始字幕轨进行长文本上下文的总结与归纳，提取视频核心大纲 (Video Context Summary)。
 * 归纳出的 summary 会反馈给字幕翻译 API，以便提供语义支撑。
 */
export const apiSummarizeContext = async ({
  videoId,
  title,
  description,
  transcript,
  apiSetting,
}) => {
  const cacheOpts = { apiSlug: apiSetting.apiSlug, videoId };
  const cacheInput = `${URL_CACHE_CONTEXT}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取总结摘要缓存，避免每次打开同一视频重复对长文本请求总结
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 调用大模型/特定接口生成视频提炼大纲
  const summary = await handleSummarize({
    title,
    description,
    transcript,
    apiSetting,
  });

  if (summary) {
    putHttpCachePolyfill(cacheInput, null, summary);
    return summary;
  }

  return "";
};

// 辅助 API 子模块再导出，保持对外导入路径 "../services" 不变。
export { apiMsAuth } from "./auth";
export { apiGoogleLangdetect, apiMicrosoftLangdetect } from "./langdetect";
export { apiMicrosoftDict, apiYoudaoDict } from "./dictionary";
export { apiBaiduSuggest, apiYoudaoSuggest } from "./suggest";
export * from "./zdic";

