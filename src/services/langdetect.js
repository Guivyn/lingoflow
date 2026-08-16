/**
 * @file langdetect.js
 * @description 语言检测 API（Google / 微软 Edge）。
 */

import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import { URL_CACHE_DELANG, OPT_TRANS_MICROSOFT } from "../config";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { getBatchQueue } from "../libs/batchQueue";
import { handleMicrosoftLangdetect } from "../providers/translation";


/**
 * 谷歌语言识别 API。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 识别出的 ISO 语言简写代码 (e.g. "en")
 */
export const apiGoogleLangdetect = async (text) => {
  const params = {
    client: "gtx",
    dt: "t",
    dj: 1,
    ie: "UTF-8",
    sl: "auto",
    tl: "zh-CN",
    q: text,
  };
  const input = `https://translate.googleapis.com/translate_a/single?${queryString.stringify(params)}`;
  const init = {
    headers: {
      "Content-type": "application/json",
    },
  };
  // 语言识别通常调用频繁，此处开启 useCache: true 节省请求开销
  const res = await fetchData(input, init, { useCache: true });

  if (res?.src) {
    await putHttpCachePolyfill(input, init, res);
    return res.src;
  }

  return "";
};

/**
 * 微软 Edge 语言识别 API。
 * 支持在队列中进行高并发批处理合并（Batching）以及本地缓存。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 语言简写代码
 */
export const apiMicrosoftLangdetect = async (text) => {
  const cacheOpts = { text, detector: OPT_TRANS_MICROSOFT };
  const cacheInput = `${URL_CACHE_DELANG}?${queryString.stringify(cacheOpts)}`;

  // 1. 优先读取本地网络缓存
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  // 2. 无缓存时，推入批量请求合并队列中（200ms 内的请求合并发送，每批最大 20 条）
  const key = `${URL_CACHE_DELANG}_${OPT_TRANS_MICROSOFT}`;
  const queue = getBatchQueue(key, handleMicrosoftLangdetect, {
    batchInterval: 200,
    batchSize: 20,
    batchLength: 100000,
  });
  const lang = await queue.addTask(text);

  if (lang) {
    putHttpCachePolyfill(cacheInput, null, lang);
    return lang;
  }

  return "";
};
