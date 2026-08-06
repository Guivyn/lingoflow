import {
  OPT_TRANS_GOOGLE,
  OPT_TRANS_MICROSOFT,
  OPT_LANGS_TO_SPEC,
  OPT_LANGS_SPEC_DEFAULT,
  defaultSystemPrompt,
  defaultSubtitlePrompt,
  defaultNobatchPrompt,
  defaultNobatchUserPrompt,
  defaultDictUserPrompt,
  defaultSystemPromptXml,
  defaultSystemPromptLines,
} from "../config";
import { getProvider, getProviderCapability } from "../providers";
import {
  buildSubtitleSystemPrompt,
  buildSubtitleUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "../core/prompt/PromptBuilder";
import { getPauseLevel, parseAIRes, parseSTRes } from "../providers/shared";
import { msAuth } from "../libs/auth";
import { apiBingTranslate } from "./bing";
import { createInterpreter } from "../libs/interpreter";
import {
  parseJsonObj,
  extractJson,
  stripMarkdownCodeBlock,
} from "../libs/utils";
import {
  parseStreamingSegments,
  createStreamingJsonParser,
  createStreamingSubtitleParser,
  createRealtimeStreamParser,
  detectStreamFormat,
  getStreamDelta,
} from "../libs/stream";
import { appLog } from "../libs/log";
import { fetchData, fetchStream } from "../libs/fetch";
import { getMsgHistory } from "./translationContext";
import { getDocInfo } from "../libs/docInfo";

export { buildSubtitleSystemPrompt };

const keyMap = new Map();
const urlMap = new Map();
const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single";

const normalizeApiKey = (value = "") =>
  String(value)
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "");

// 轮询key/url
// 轮询 Key / URL 负载均衡。
// 用于在配置了多个 API 密钥或自定义 URL 端点时，分摊频率并降低单 Key 被限流限额的风险。
const keyPick = (apiSlug, key = "", cacheMap) => {
  const keys = key
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return "";
  }

  // 从轮询缓存 cacheMap 中提取上一次使用的 Index，计算本次轮询的 Index 并写回缓存
  const preIndex = cacheMap.get(apiSlug) ?? -1;
  const curIndex = (preIndex + 1) % keys.length;
  cacheMap.set(apiSlug, curIndex);

  return keys[curIndex];
};

/**
 * 根据提示词识别字幕断句协议，供请求格式、缓存和 Playground 共用。
 */
export const detectSubtitleProtocol = (prompt = "") => {
  const normalizedPrompt = String(prompt);
  if (/WEBVTT|MM:SS\.mmm|-->/i.test(normalizedPrompt)) return "vtt-legacy";
  if (/\{\s*["']?s["']?\s*:/.test(normalizedPrompt)) return "index-v1";

  // 自定义提示词明确描述旧 p 等级时继续发送原结构，避免静默破坏已有配置。
  const mentionsQuotedP = /["'`]p["'`]/i.test(normalizedPrompt);
  const mentionsPauseLevel = /pause\s+levels?|停顿等级|暫停等級/i.test(
    normalizedPrompt
  );
  if (mentionsQuotedP && mentionsPauseLevel) return "boundary-v2";
  return "boundary-v3";
};

/** 将播放器事件压缩成发送给 AI 的稳定索引 JSON 结构。 */
export const formatIndexSubtitleEvents = (events, prompt = "") => {
  const protocol = detectSubtitleProtocol(prompt);
  const usesLegacyPauseLevel =
    protocol === "boundary-v2" ||
    protocol === "index-v1" ||
    protocol === "vtt-legacy";

  return events.map((e, i) => {
    const item = { id: i, text: e.text };
    if (usesLegacyPauseLevel && i > 0) {
      const p = getPauseLevel(e.start - events[i - 1].end);
      if (p) item.p = p;
    } else if (!usesLegacyPauseLevel && i < events.length - 1) {
      // pauseMs 挂在停顿前的事件上，可直接作为该事件成为句末的边界提示。
      const pauseMs = Math.round(events[i + 1].start - e.end);
      if (pauseMs > 0) item.pauseMs = pauseMs;
    }
    return item;
  });
};

const usesIndexSubtitleInput = (prompt = "") => {
  // 只有明确声明 VTT 的旧提示词继续接收旧结构；其余字幕请求统一使用纯索引 JSON。
  return detectSubtitleProtocol(prompt) !== "vtt-legacy";
};

/**
 * 注入推理模式（Thinking）的专用控制参数。
 * 将 DeepSeek 与 OpenAI 的推理模式/强度配置统一映射为请求参数。
 */
/**
 * 构建统一的 Fetch init 对象。
 * 对请求体和方法做健全处理。
 */
const genInit = ({
  url = "",
  body = null,
  headers = {},
  userMsg = null,
  method = "POST",
}) => {
  if (!url) {
    throw new Error("genInit: url is empty");
  }

  const init = {
    method,
    headers,
  };
  if (method !== "GET" && method !== "HEAD" && body) {
    let payload = JSON.stringify(body);
    const id = body?.params?.id;

    // WAF（网关指纹防火墙）特征规避策略。
    // 很多公开的 JSON-RPC 翻译网关由于序列化格式完全一致，极易被 WAF 通过报文指纹拦截阻断。
    // 此处针对 body 中的随机 id 动态对方法字段进行了微小的空格格式抖动（在冒号前或后加入空格），
    // 能够破坏 WAF 的静态字符串指纹匹配，达到长期稳定抗封防盾的效果。
    if (id) {
      payload = payload.replace(
        'method":"',
        (id + 3) % 13 === 0 || (id + 5) % 29 === 0
          ? 'method" : "'
          : 'method": "'
      );
    }
    Object.assign(init, { body: payload });
  }

  return [url, init, userMsg];
};

/**
 * 构造翻译接口请求参数
 * @param {*}
 * @returns
 */
const genTransReq = async ({ reqHook, ...args }) => {
  const {
    apiType,
    apiSlug,
    key,
    systemPrompt,
    subtitlePrompt,
    // userPrompt,
    nobatchPrompt = defaultNobatchPrompt,
    nobatchUserPrompt = defaultNobatchUserPrompt,
    useBatchFetch,
    from,
    to,
    fromLang,
    toLang,
    texts,
    glossary,
    aiTerms,
    customHeader,
    customBody,
    events,
    tone,
    docInfo: externalDocInfo,
  } = args;

  args.key = normalizeApiKey(key);
  if (getProviderCapability(apiType, "mulkeys")) {
    args.key = keyPick(apiSlug, args.key, keyMap);
  }

  if (getProviderCapability(apiType, "multipleUrls")) {
    args.url = keyPick(apiSlug, args.url, urlMap);
  }

  if (getProviderCapability(apiType, "ai")) {
    const docInfo = externalDocInfo || getDocInfo();

    let baseSystemPrompt = events
      ? buildSubtitleSystemPrompt({
          subtitlePrompt,
          from,
          to,
          fromLang,
          toLang,
          texts,
          docInfo,
          tone,
          aiTerms,
        })
      : buildSystemPrompt({
          systemPrompt: useBatchFetch ? systemPrompt : nobatchPrompt,
          from,
          to,
          fromLang,
          toLang,
          texts,
          docInfo,
          tone,
        });

    args.systemPrompt = baseSystemPrompt;
    args.userPrompt = events
      ? buildSubtitleUserPrompt({
          formattedEvents: usesIndexSubtitleInput(subtitlePrompt)
            ? formatIndexSubtitleEvents(events, subtitlePrompt)
            : events,
        })
      : buildUserPrompt({
          nobatchUserPrompt,
          useBatchFetch,
          from,
          to,
          fromLang,
          toLang,
          texts,
          docInfo,
          tone,
          glossary,
          aiTerms,
        });
  }

  const provider = getProvider(apiType);
  if (!provider) {
    throw new Error(`Unknown API type: ${apiType}`);
  }

  const {
    url = "",
    body = null,
    headers = {},
    userMsg = null,
    method = "POST",
  } = provider.buildRequest(args);

  // 合并用户自定义headers和body
  if (customHeader?.trim()) {
    Object.assign(headers, parseJsonObj(customHeader));
  }
  if (customBody?.trim()) {
    Object.assign(body, parseJsonObj(customBody));
  }

  // 执行 request hook
  if (reqHook?.trim() && !events) {
    try {
      const req = {
        url,
        body,
        headers,
        userMsg,
        method,
      };
      const hookSandbox = createInterpreter();
      hookSandbox.run(`exports.reqHook = ${reqHook}`);
      const hookResult = await hookSandbox.exports.reqHook(
        {
          ...args,
          defaultSystemPrompt,
          defaultSystemPromptXml,
          defaultSystemPromptLines,
          defaultSubtitlePrompt,
          defaultNobatchPrompt,
          defaultNobatchUserPrompt,
          req,
        },
        req
      );
      if (hookResult && hookResult.url) {
        return genInit(hookResult);
      }
    } catch (err) {
      appLog("run req hook", err);
      throw new Error(`Request hook error: ${err.message}`);
    }
  }

  return genInit({ url, body, headers, userMsg, method });
};

/**
 * 解析翻译接口返回数据
 * @param {*} res
 * @param {*} param3
 * @returns
 */
const parseTransRes = async (
  res,
  {
    texts,
    from,
    to,
    fromLang,
    toLang,
    langMap,
    resHook,
    history,
    userMsg,
    apiType,
    useBatchFetch,
  }
) => {
  // 执行 response hook
  if (resHook?.trim()) {
    try {
      const hookSandbox = createInterpreter();
      hookSandbox.run(`exports.resHook = ${resHook}`);
      const hookResult = await hookSandbox.exports.resHook({
        apiType,
        userMsg,
        res,
        texts,
        from,
        to,
        fromLang,
        toLang,
        langMap,
        extractJson,
        parseAIRes,
      });
      if (hookResult && Array.isArray(hookResult.translations)) {
        if (history && userMsg && hookResult.modelMsg) {
          history.add(userMsg, hookResult.modelMsg);
        }
        return hookResult.translations;
      } else if (Array.isArray(hookResult)) {
        return hookResult;
      }
    } catch (err) {
      appLog("run res hook", err);
      throw new Error(`Response hook error: ${err.message}`);
    }
  }

  const provider = getProvider(apiType);
  if (!provider) {
    throw new Error("parse translate result: apiType not matched", apiType);
  }

  return provider.parseTranslate(res, { history, userMsg, useBatchFetch });
};

/**
 * 发起 AI 词典请求并返回 Markdown 结果。
 *
 * 这里将词典提示词临时映射到非聚合翻译请求字段，
 * 以便复用 `genTransReq` 已经实现好的鉴权、模型参数、Hook 和流式协议适配。
 *
 * @param {Object} params 词典请求参数
 * @param {string} params.text 需要解析的文本
 * @param {string} params.from 已映射到当前接口规格的源语言名称
 * @param {string} params.to 已映射到当前接口规格的目标语言名称
 * @param {string} params.fromLang 源语言代码
 * @param {string} params.toLang 目标语言代码
 * @param {Object} params.apiSetting 当前 AI 接口配置
 * @param {Object} [params.docInfo] 页面标题、描述与摘要
 * @param {string} [params.context] 当前选区所在段落上下文
 * @param {Function} [params.onStreamChunk] 流式增量回调
 * @param {AbortSignal} [params.signal] 取消信号
 * @returns {Promise<string>} Markdown 格式的词典解析结果
 */
export const handleDict = async ({
  text,
  from,
  to,
  fromLang,
  toLang,
  apiSetting,
  docInfo,
  context = "",
  onStreamChunk,
  signal,
}) => {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const {
    apiType,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    dictPrompt,
    dictUserPrompt,
  } = apiSetting;
  const enableStream =
    Boolean(onStreamChunk) &&
    apiSetting.useStream &&
    getProviderCapability(apiType, "stream");
  if (!dictPrompt) {
    throw new Error("AI dictionary prompt is empty.");
  }

  // 词典请求本质上是单条文本解析，强制关闭批量模式，避免进入批量 JSON 解析分支。
  const requestApiSetting = {
    ...apiSetting,
    useBatchFetch: false,
    useStream: enableStream,
    nobatchPrompt: dictPrompt,
    nobatchUserPrompt: dictUserPrompt ?? defaultDictUserPrompt,
  };
  const dictDocInfo = docInfo || getDocInfo();

  // 将选区段落作为 docInfo.context 注入，使默认词典提示词中的 {{context}} 可被替换。
  const [input, init] = await genTransReq({
    ...requestApiSetting,
    texts: [text],
    from,
    to,
    fromLang,
    toLang,
    docInfo: {
      ...(dictDocInfo || {}),
      context,
    },
  });

  if (enableStream) {
    try {
      let fullContent = "";

      for await (const rawData of fetchStream(input, init, {
        useCache: false,
        usePool: true,
        fetchInterval,
        fetchLimit,
        httpTimeout,
        signal,
      })) {
        try {
          const json = JSON.parse(rawData);
          const delta = getStreamDelta(json, apiType);
          if (!delta) continue;

          fullContent += delta;
          // 流式模型可能先输出 Markdown 代码围栏，边流式展示边剥离可避免 UI 闪出 ```。
          fullContent = stripMarkdownCodeBlock(fullContent, true);
          onStreamChunk({ markdown: fullContent });
        } catch {
          // 忽略单个 SSE 数据帧解析失败，等待后续帧继续输出。
        }
      }

      const markdown = stripMarkdownCodeBlock(fullContent).trim();
      if (!markdown) {
        throw new Error("dictionary got empty content");
      }

      return markdown;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw err;
      }

      appLog("dictionary stream failed, fallback to non-stream", err);
    }

    // 流式协议异常时自动降级为普通请求，保留 AI 词典功能可用性。
    const [fallbackInput, fallbackInit] = await genTransReq({
      ...requestApiSetting,
      useStream: false,
      texts: [text],
      from,
      to,
      fromLang,
      toLang,
      docInfo: {
        ...(dictDocInfo || {}),
        context,
      },
    });

    const fallbackRes = await fetchData(fallbackInput, fallbackInit, {
      useCache: false,
      usePool: true,
      fetchInterval,
      fetchLimit,
      httpTimeout,
      signal,
    });
    if (!fallbackRes) {
      throw new Error("dictionary got empty response");
    }

    const fallbackMarkdown = getProvider(apiType)?.parseDict?.(fallbackRes);
    if (!fallbackMarkdown) {
      throw new Error("dictionary got empty content");
    }

    return fallbackMarkdown;
  }

  const res = await fetchData(input, init, {
    useCache: false,
    usePool: true,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    signal,
  });
  if (!res) {
    throw new Error("dictionary got empty response");
  }

  const markdown = getProvider(apiType)?.parseDict?.(res);
  if (!markdown) {
    throw new Error("dictionary got empty content");
  }

  return markdown;
};

/**
 * 发送翻译请求并解析
 * 支持流式和非流式两种模式
 * @param {*} texts 待翻译文本数组
 * @param {*} options 翻译选项
 * @yields {{id: number, result: [string, string]}} 流式模式下逐个返回结果
 * @returns {Promise<Array>} 非流式模式下返回完整结果数组
 */
export async function* handleTranslate(
  texts = [],
  {
    from,
    to,
    fromLang,
    toLang,
    langMap,
    glossary,
    apiSetting,
    usePool,
    docInfo,
    signal,
  }
) {
  if (signal?.aborted) return;

  let history = null;
  let hisMsgs = [];
  const {
    apiType,
    apiSlug,
    contextSize,
    useContext,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    useStream,
  } = apiSetting;
  if (useContext && getProviderCapability(apiType, "context")) {
    history = getMsgHistory(apiSlug, contextSize);
    hisMsgs = history.getAll();
  }

  const enableStream = useStream && getProviderCapability(apiType, "stream");

  let token = "";
  let requestApiType = apiType;
  if (apiType === OPT_TRANS_MICROSOFT) {
    try {
      token = await msAuth();
      if (!token) {
        throw new Error("got msauth error");
      }
    } catch (err) {
      // Edge 免费鉴权接口在部分网络不可用，先走 Bing 网页版免费通道，再失败才降级 Google。
      appLog("ms auth failed, try bing fallback", err);
      try {
        const bingResults = await apiBingTranslate(texts, from, to);
        for (let i = 0; i < bingResults.length; i++) {
          yield { id: i, result: bingResults[i] };
        }
        return;
      } catch (bingErr) {
        appLog("bing fallback failed, fallback to google", bingErr);
        requestApiType = OPT_TRANS_GOOGLE;
        token = "";
        const googleLangMap =
          OPT_LANGS_TO_SPEC[OPT_TRANS_GOOGLE] || OPT_LANGS_SPEC_DEFAULT;
        from = googleLangMap.get(fromLang);
        to = googleLangMap.get(toLang);
        langMap = googleLangMap;
      }
    }
  }

  const getRequest = (requestUseStream, requestTexts = texts) =>
    genTransReq({
      ...apiSetting,
      apiType: requestApiType,
      ...(requestApiType === OPT_TRANS_GOOGLE
        ? { url: GOOGLE_TRANSLATE_URL }
        : {}),
      texts: requestTexts,
      from,
      to,
      fromLang,
      toLang,
      langMap,
      glossary,
      hisMsgs,
      token,
      useStream: requestUseStream,
      docInfo,
    });

  const runNonStream = async function* (
    input,
    init,
    userMsg,
    requestTexts = texts
  ) {
    const response = await fetchData(input, init, {
      useCache: false,
      usePool,
      fetchInterval,
      fetchLimit,
      httpTimeout,
      signal,
    });
    if (!response) {
      throw new Error("translate got empty response");
    }

    const result = await parseTransRes(response, {
      texts: requestTexts,
      from,
      to,
      fromLang,
      toLang,
      langMap,
      history,
      userMsg,
      ...apiSetting,
      apiType: requestApiType,
    });
    if (!result?.length) {
      throw new Error("translate got an unexpected result");
    }

    for (let i = 0; i < result.length; i++) {
      yield { id: i, result: result[i] };
    }
  };

  // Google 不支持批量打包，微软鉴权失败降级后逐条翻译，保持批次 id 对齐。
  if (requestApiType === OPT_TRANS_GOOGLE && texts.length > 1) {
    for (let i = 0; i < texts.length; i++) {
      const [input, init, userMsg] = await getRequest(false, [texts[i]]);
      const response = await fetchData(input, init, {
        useCache: false,
        usePool,
        fetchInterval,
        fetchLimit,
        httpTimeout,
        signal,
      });
      if (!response) {
        throw new Error("translate got empty response");
      }
      const result = await parseTransRes(response, {
        texts: [texts[i]],
        from,
        to,
        fromLang,
        toLang,
        langMap,
        history,
        userMsg,
        ...apiSetting,
        apiType: requestApiType,
      });
      yield { id: i, result: result?.[0] };
    }
    return;
  }

  const [input, init, userMsg] = await getRequest(enableStream);

  if (enableStream) {
    try {
      yield* handleTranslateStreamInternal(texts, input, init, {
        apiType,
        history,
        userMsg,
        useBatchFetch: apiSetting.useBatchFetch,
        usePool,
        fetchInterval,
        fetchLimit,
        httpTimeout,
        signal,
        streamRenderMode: apiSetting.streamRenderMode || "disabled",
      });
      return;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw err;
      }
      appLog("translate stream failed, fallback to non-stream", err);
    }

    const [fallbackInput, fallbackInit, fallbackUserMsg] =
      await getRequest(false);
    yield* runNonStream(fallbackInput, fallbackInit, fallbackUserMsg);
    return;
  }

  yield* runNonStream(input, init, userMsg);
}

/**
 * 内部流式翻译处理
 */
async function* handleTranslateStreamInternal(
  texts,
  input,
  init,
  {
    apiType,
    history,
    userMsg,
    useBatchFetch,
    usePool,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    signal,
    streamRenderMode,
  }
) {
  const results = new Array(texts.length).fill(null);
  let fullContent = "";
  const processedIds = new Set();

  const jsonParser = createStreamingJsonParser();
  const realtimeParser =
    streamRenderMode === "realtime" ? createRealtimeStreamParser() : null;
  let isJsonFormat = false;
  let formatDetected = false;

  try {
    for await (const rawData of fetchStream(input, init, {
      useCache: false,
      usePool,
      fetchInterval,
      fetchLimit,
      httpTimeout,
      signal,
    })) {
      try {
        const json = JSON.parse(rawData);
        const delta = getStreamDelta(json, apiType);

        if (delta) {
          fullContent += delta;
          fullContent = stripMarkdownCodeBlock(fullContent, true);

          if (!useBatchFetch) {
            if (streamRenderMode === "realtime") {
              yield { id: 0, partialText: fullContent, isComplete: false };
            }
            continue;
          }

          if (!formatDetected) {
            const { isJson, detected } = detectStreamFormat(fullContent);
            if (detected) {
              formatDetected = true;
              isJsonFormat = isJson;
              // 格式检测成功后，将累积的内容写入解析器
              if (isJsonFormat) {
                for (const { id, translation } of jsonParser.write(
                  fullContent
                )) {
                  results[id] = translation;
                  yield { id, result: translation };
                }
              }
            }
          } else if (isJsonFormat) {
            for (const { id, translation } of jsonParser.write(delta)) {
              results[id] = translation;
              yield { id, result: translation };
            }
          } else {
            for (const { id, translation } of parseStreamingSegments(
              fullContent,
              processedIds
            )) {
              results[id] = translation;
              yield { id, result: translation };
            }
          }
          // 实时渲染模式：yield 段落级中间态
          if (realtimeParser && streamRenderMode === "realtime") {
            const items = realtimeParser.write(delta);
            for (const { id, partialText, isComplete } of items) {
              if (!isComplete) {
                yield { id, partialText, isComplete: false };
              }
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    if (isJsonFormat) {
      jsonParser.end();
    }
  } catch (error) {
    appLog("handleTranslateStream error", error);
    throw error;
  }

  // 最终再解析一次，捕获可能遗漏的段落
  const hasEmpty = results.some((r) => !r);
  if (hasEmpty) {
    const parsed = parseAIRes(fullContent, useBatchFetch);
    for (let i = 0; i < texts.length && i < parsed.length; i++) {
      if (!results[i]) {
        results[i] = parsed[i];
        yield { id: i, result: results[i] };
      }
    }
  }

  if (history && userMsg) {
    history.add(userMsg, {
      role: "assistant",
      content: fullContent,
    });
  }
}

/**
 * Microsoft语言识别聚合及解析
 * @param {*} texts
 * @returns
 */
export const handleMicrosoftLangdetect = async (texts = []) => {
  const token = await msAuth();
  const input =
    "https://api-edge.cognitive.microsofttranslator.com/detect?api-version=3.0";
  const init = {
    headers: {
      "Content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
    body: JSON.stringify(texts.map((text) => ({ Text: text }))),
  };

  const res = await fetchData(input, init, {
    useCache: false,
  });

  if (Array.isArray(res)) {
    return res.map((r) => r.language);
  }

  return [];
};

/**
 * 执行字幕断句与字幕翻译请求。
 *
 * @param {Object} params 字幕请求参数。
 * @param {Array<Object>} params.events 当前字幕分块内的原始事件列表。
 * @param {string} params.from 源语言代码。
 * @param {string} params.to 目标语言代码。
 * @param {Object} params.apiSetting 字幕断句所使用的 API 配置。
 * @param {Object} [params.docInfo] 页面标题、描述和 AI 摘要等上下文。
 * @param {Function} [params.onSubtitleChunk] 流式解析到完整字幕句子时触发的回调。
 * @param {AbortSignal} [params.signal] 调用方生命周期取消信号，会下传到 fetch/fetchStream。
 * @returns {Promise<Array<Object>>} 完整字幕句子数组。
 */
export const handleSubtitle = async ({
  events,
  from,
  to,
  apiSetting,
  docInfo,
  onSubtitleChunk,
  signal,
}) => {
  const { apiType, fetchInterval, fetchLimit, httpTimeout, useStream } =
    apiSetting;
  const enableStream =
    Boolean(onSubtitleChunk) &&
    useStream &&
    getProviderCapability(apiType, "stream");

  const [input, init] = await genTransReq({
    ...apiSetting,
    // 字幕流式只在调用方显式消费句子分块时开启，避免普通完整响应路径误把 SSE 当 JSON 解析。
    useStream: enableStream,
    events,
    from,
    to,
    fromLang: from,
    toLang: to,
    docInfo,
  });

  if (enableStream) {
    try {
      const subtitles = await handleSubtitleStreamInternal(input, init, {
        events,
        apiType,
        fetchInterval,
        fetchLimit,
        httpTimeout,
        fromLang: from,
        onSubtitleChunk,
        signal,
      });
      if (subtitles?.length) {
        return subtitles;
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        throw err;
      }
      appLog("subtitle stream failed, fallback to non-stream", err);
    }

    return handleSubtitle({
      events,
      from,
      to,
      apiSetting: { ...apiSetting, useStream: false },
      docInfo,
      signal,
    });
  }

  const res = await fetchData(input, init, {
    useCache: false,
    usePool: true,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    signal,
  });
  if (!res) {
    appLog("subtitle got empty response");
    return [];
  }

  return getProvider(apiType)?.parseSubtitle?.(res, { events, from }) || [];
};

/**
 * 处理字幕断句的 SSE 流式响应。
 *
 * @param {string} input 请求地址。
 * @param {Object} init Fetch 初始化参数。
 * @param {Object} options 流式解析上下文。
 * @param {Array<Object>} options.events 当前字幕事件列表，用于把 s/e 索引映射回时间轴。
 * @param {string} options.apiType 翻译接口类型。
 * @param {number} options.fetchInterval 请求池间隔。
 * @param {number} options.fetchLimit 请求池并发限制。
 * @param {number} options.httpTimeout 请求超时时间。
 * @param {string} options.fromLang 源语言，用于按语言规则重建字幕原文。
 * @param {Function} options.onSubtitleChunk 新句子完成时触发的回调。
 * @param {AbortSignal} options.signal 取消信号。
 * @returns {Promise<Array<Object>>} 最终完整字幕数组。
 */
async function handleSubtitleStreamInternal(
  input,
  init,
  {
    events,
    apiType,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    fromLang,
    onSubtitleChunk,
    signal,
  }
) {
  const parser = createStreamingSubtitleParser(events, { fromLang });
  let fullContent = "";
  const emitted = [];
  const emittedKeys = new Set();

  const appendSubtitles = (subtitles, isFinal = false) => {
    const fresh = [];
    for (const subtitle of subtitles || []) {
      const key = `${subtitle._si}:${subtitle._ei}`;
      if (emittedKeys.has(key)) continue;
      emittedKeys.add(key);
      emitted.push(subtitle);
      fresh.push(subtitle);
    }

    if (fresh.length) {
      // 只有完整句子对象闭合后才上抛，避免半句字幕污染播放器时间轴。
      onSubtitleChunk({ subtitles: fresh, isFinal });
    }
  };

  for await (const rawData of fetchStream(input, init, {
    useCache: false,
    usePool: true,
    fetchInterval,
    fetchLimit,
    httpTimeout,
    signal,
  })) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    try {
      const json = JSON.parse(rawData);
      const delta = getStreamDelta(json, apiType);
      if (!delta) continue;

      fullContent += delta;
      appendSubtitles(parser.write(delta), false);
    } catch {
      // 单个 SSE 分片异常不终止整条字幕流，等待后续分片或最终兜底解析补齐。
    }
  }

  appendSubtitles(parser.end(), false);

  const finalSubtitles = parseSTRes(fullContent, events, fromLang);
  appendSubtitles(finalSubtitles, true);

  return finalSubtitles?.length
    ? finalSubtitles
    : emitted.sort((a, b) => a.start - b.start);
}

/**
 * 上下文摘要
 * @param {*} param0
 * @returns
 */
const summarizeSystemPrompt = `Analyze the video title, description, and transcript below. Produce a concise briefing (max 300 words) to help a subtitle translator understand the content accurately.

Cover these aspects:
1. Main topic, themes, and subject domain
2. Key terminology with brief definitions or context
3. Important proper nouns (people, organizations, products, places)
4. Speaker's tone and register
5. Abbreviations, jargon, or ambiguous terms needing consistent handling

Output plain text only. No markdown, no formatting, no headers.`;

export const handleSummarize = async ({
  title,
  description,
  transcript,
  apiSetting,
}) => {
  const { apiType, fetchInterval, fetchLimit, httpTimeout } = apiSetting;

  const userPrompt = [
    title && `Title: ${title}`,
    description && `Description: ${description}`,
    `\nTranscript:\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n");

  const [input, init] = await genTransReq({
    ...apiSetting,
    // 字幕上下文总结需要一次性文本结果，不能继承段落翻译的流式输出设置。
    useStream: false,
    texts: [""],
    from: "auto",
    to: "en",
    fromLang: "auto",
    toLang: "en",
    useBatchFetch: false,
    nobatchPrompt: summarizeSystemPrompt,
    nobatchUserPrompt: userPrompt,
  });

  const res = await fetchData(input, init, {
    useCache: false,
    usePool: true,
    fetchInterval,
    fetchLimit,
    httpTimeout,
  });

  if (!res) return "";

  return getProvider(apiType)?.parseSummarize?.(res) || "";
};
