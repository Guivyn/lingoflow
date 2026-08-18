/**
 * @file langdetect.js
 * @description 语言检测 API（Google）。
 */

import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import { putHttpCachePolyfill } from "../libs/cache";

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
