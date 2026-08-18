/**
 * @file bing.js
 * @description Bing 网页版免费翻译通道。Edge 免费鉴权接口不可用时，
 * 从 cn.bing.com 翻译页动态抓取 IG/IID/token/key 后调用 ttranslatev3。
 */

import { fetchData } from "../libs/fetch";

const BING_TRANSLATOR_PAGE = "https://cn.bing.com/translator";
const BING_TRANSLATE_API = "https://cn.bing.com/ttranslatev3";
const BING_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/151.0.4129.59";
// Bing 只是降级通道，不能让它把整页翻译拖到默认 30s 超时；6 秒拿不到结果就放弃。
const BING_HTTP_TIMEOUT = 6;

let bingConfig = null;
let bingConfigPromise = null;

const parseBingConfig = (html) => {
  const IG = html.match(/IG:"([^"]+)"/)?.[1];
  const IID = html.match(/data-iid="([^"]+)"/)?.[1];
  const abuseRaw = html.match(
    /params_AbusePreventionHelper\s?=\s?(\[[^\]]+\])/
  )?.[1];
  const [key, token, expiryInterval] = abuseRaw
    ? JSON.parse(abuseRaw)
    : [];

  if (!IG || !IID || !token || !key) {
    throw new Error("Failed to parse Bing translator config");
  }

  return {
    IG,
    IID,
    key,
    token,
    expiresAt: Number(key) + Number(expiryInterval || 0),
    count: 0,
  };
};

const fetchBingConfig = async (httpTimeout = BING_HTTP_TIMEOUT) => {
  const html = await fetchData(
    BING_TRANSLATOR_PAGE,
    {
      headers: {
        "User-Agent": BING_UA,
      },
    },
    { httpTimeout }
  );

  if (typeof html !== "string" || html.length < 1000) {
    throw new Error("Failed to fetch Bing translator page");
  }

  return parseBingConfig(html);
};

const getBingConfig = async (httpTimeout) => {
  if (bingConfig && Date.now() < bingConfig.expiresAt) {
    return bingConfig;
  }

  if (!bingConfigPromise) {
    bingConfigPromise = fetchBingConfig(httpTimeout)
      .then((config) => {
        bingConfig = config;
        return config;
      })
      .finally(() => {
        bingConfigPromise = null;
      });
  }

  return bingConfigPromise;
};

/**
 * 调用 Bing 网页版翻译。
 * @param {string[]} texts 待翻译文本列表
 * @param {string} from 源语言代码（微软格式，如 en）
 * @param {string} to 目标语言代码（微软格式，如 zh-Hans）
 * @returns {Promise<Array<[string, string]>>} [译文, 检测语言] 列表
 */
export const apiBingTranslate = async (texts, from, to, opts = {}) => {
  const httpTimeout = opts.httpTimeout || BING_HTTP_TIMEOUT;
  const config = await getBingConfig(httpTimeout);
  const results = [];

  for (const text of texts) {
    config.count += 1;
    const url = `${BING_TRANSLATE_API}?isVertical=1&&IG=${config.IG}&IID=${config.IID}&SFX=${config.count}`;
    const body = new URLSearchParams({
      fromLang: from,
      text,
      token: config.token,
      key: String(config.key),
      to,
    });
    const res = await fetchData(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": BING_UA,
          Referer: BING_TRANSLATOR_PAGE,
        },
        body: body.toString(),
      },
      { httpTimeout }
    );

    const item = Array.isArray(res) ? res[0] : null;
    const translation = item?.translations?.[0]?.text;
    if (!translation) {
      throw new Error("Bing translate got empty response");
    }

    results.push([translation, item?.detectedLanguage?.language || ""]);
  }

  return results;
};
