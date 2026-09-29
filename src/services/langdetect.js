/**
 * @file langdetect.js
 * @description 语言检测 API（Google）。
 */

import { fetchData } from "../libs/fetch";
import { DEFAULT_API_LIST, OPT_TRANS_GOOGLE } from "../config";
import { putHttpCachePolyfill } from "../libs/cache";

/**
 * 谷歌语言识别 API。
 * @param {string} text 待识别的原文文本
 * @returns {Promise<string>} 识别出的 ISO 语言简写代码 (e.g. "en")
 */
export const apiGoogleLangdetect = async (text) => {
  const api = DEFAULT_API_LIST.find(
    (item) => item.apiType === OPT_TRANS_GOOGLE
  );
  const input =
    api?.url || "https://translate-pa.googleapis.com/v1/translateHtml";
  const body = [[[text], "auto", "zh-CN"], "wt_lib"];
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json+protobuf",
      ...(api?.key ? { "X-Goog-API-Key": api.key } : {}),
    },
    body: JSON.stringify(body),
  };
  // 语言识别通常调用频繁，此处开启 useCache: true 节省请求开销
  const res = await fetchData(input, init, { useCache: true });

  const lang = res?.[1]?.[0];
  if (lang) {
    await putHttpCachePolyfill(input, init, res);
    return lang;
  }

  return "";
};
