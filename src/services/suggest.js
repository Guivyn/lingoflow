/**
 * @file suggest.js
 * @description 输入联想建议 API（百度 / 有道）。
 */

import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import { putHttpCachePolyfill } from "../libs/cache";


/**
 * 百度输入建议 API (用于输入翻译功能)。
 * @param {string} text 输入的关键词
 * @returns {Promise<Array<Object>>} 建议列表
 */
export const apiBaiduSuggest = async (text) => {
  const input = "https://fanyi.baidu.com/sug";
  const init = {
    headers: {
      "Content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      kw: text,
    }),
  };
  const res = await fetchData(input, init, { useCache: true });

  if (res?.errno === 0) {
    await putHttpCachePolyfill(input, init, res);
    return res.data;
  }

  return [];
};

/**
 * 有道输入建议 API。
 * @param {string} text 关键词
 * @returns {Promise<Array<Object>>} 有道联想建议数据
 */
export const apiYoudaoSuggest = async (text) => {
  const params = {
    num: 5,
    ver: 3.0,
    doctype: "json",
    cache: false,
    le: "en",
    q: text,
  };
  const input = `https://dict.youdao.com/suggest?${queryString.stringify(params)}`;
  const init = {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "GET",
  };
  const res = await fetchData(input, init, { useCache: true });

  if (res?.result?.code === 200) {
    await putHttpCachePolyfill(input, init, res);
    return res.data.entries;
  }

  return [];
};
