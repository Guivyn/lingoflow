/**
 * @file dictionary.js
 * @description 在线词典 API（微软 Bing 词典 / 有道词典）。
 */

import queryString from "query-string";
import { fetchData } from "../libs/fetch";
import { URL_CACHE_BINGDICT } from "../config";
import { getHttpCachePolyfill, putHttpCachePolyfill } from "../libs/cache";
import { trustedTypesHelper } from "../libs/trustedTypes";


/**
 * 微软 Edge 在线词典检索（Bing 词典 HTML 爬取解析）。
 * 支持对划词选中的单词进行拼音、音标（英/美）、词意、时态及双语例句等多维度的解析。
 * @param {string} text 待检索查询的单词
 * @returns {Promise<Object|null>} 结构化后的 Bing 词典卡片数据
 */
export const apiMicrosoftDict = async (text) => {
  const cacheOpts = { text };
  const cacheInput = `${URL_CACHE_BINGDICT}?${queryString.stringify(cacheOpts)}`;

  // 1. 读取词典缓存，避免高频划词重复爬取 Bing 网站
  const cache = await getHttpCachePolyfill(cacheInput);
  if (cache) {
    return cache;
  }

  const host = "https://www.bing.com";
  const url = `${host}/dict/search?q=${text}&FORM=BDVSP6&cc=cn`;
  const str = await fetchData(
    url,
    { credentials: "include" }, // 携带 credentials 以免遭到网站人机拦截限制
    { useCache: false }
  );
  if (!str) {
    return null;
  }

  // 2. 利用客户端 DOMParser 提取 HTML 中高度复杂的页面数据
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    trustedTypesHelper.createHTML(str),
    "text/html"
  );

  const word = doc.querySelector("#headword > h1")?.textContent.trim();
  if (!word) {
    return null;
  }

  // 3. 提取基本释义列表 (trs)
  const trs = [];
  doc.querySelectorAll("div.qdef > ul > li").forEach(($li) => {
    const pos = $li.querySelector(".pos")?.textContent?.trim();
    const def = $li.querySelector(".def")?.textContent?.trim();
    trs.push({ pos, def });
  });

  // 4. 提取单词的时态变形 (presents)
  const presents = [];
  doc.querySelectorAll("div.hd_div1>.hd_if>.p1-5").forEach(($li) => {
    const present = $li.textContent?.trim();
    presents.push(present);
  });

  // 5. 提取英汉双解详细释义 (ecs)
  const ecs = [];
  doc.querySelectorAll(".each_seg>.li_pos").forEach(($li) => {
    const pos = $li.querySelector(".pos_lin>.pos")?.textContent?.trim();
    const lis = [];
    $li.querySelectorAll(".de_seg>.se_lis").forEach(($l) => {
      lis.push($l.querySelector(".de_co")?.textContent?.trim());
    });
    ecs.push({ pos, lis });
  });

  // 6. 提取双语例句信息 (sentences)
  const sentences = [];
  doc.querySelectorAll("#sentenceSeg .se_li").forEach(($li) => {
    const eng = $li.querySelector(".sen_en")?.textContent?.trim();
    const chs = $li.querySelector(".sen_cn")?.textContent?.trim();
    if (eng && chs) {
      sentences.push({ eng, chs });
    }
  });

  // 7. 提取英汉真人发音音频和国际音标 (aus)
  const aus = [];
  const $audioUK = doc.querySelector("#bigaud_uk");
  const $audioUS = doc.querySelector("#bigaud_us");

  // 提取英国音标与发音 mp3 路径
  if ($audioUK) {
    const audioUK = host + $audioUK?.dataset?.mp3link;
    const $phoneticUK = $audioUK.parentElement?.previousElementSibling;
    const phoneticUK = $phoneticUK?.textContent
      ?.trim()
      ?.match(/\[(.*?)\]/)?.[1];
    aus.push({ key: "英", audio: audioUK, phonetic: phoneticUK });
  }

  // 提取美国音标与发音 mp3 路径
  if ($audioUS) {
    const audioUS = host + $audioUS?.dataset?.mp3link;
    const $phoneticUS = $audioUS.parentElement?.previousElementSibling;
    const phoneticUS = $phoneticUS?.textContent
      ?.trim()
      ?.match(/\[(.*?)\]/)?.[1];
    aus.push({ key: "美", audio: audioUS, phonetic: phoneticUS });
  }

  // 若上述选择器失效，尝试用备选选择器提取纯文本音标
  if (aus.length === 0) {
    const $pronInfo = doc.querySelector(".hd_pr");
    const $pronInfoUS = doc.querySelector(".hd_prUS");

    if ($pronInfo) {
      const phoneticText = $pronInfo.textContent?.trim();
      const phoneticMatch = phoneticText?.match(/\[([^\]]+)\]/);
      if (phoneticMatch) {
        aus.push({ key: "英", phonetic: phoneticMatch[1] });
      }
    }

    if ($pronInfoUS) {
      const phoneticText = $pronInfoUS.textContent?.trim();
      const phoneticMatch = phoneticText?.match(/\[([^\]]+)\]/);
      if (phoneticMatch) {
        aus.push({ key: "美", phonetic: phoneticMatch[1] });
      }
    }
  }

  const res = { word, trs, aus, ecs, sentences, presents };
  // 存入词典本地缓存
  putHttpCachePolyfill(cacheInput, null, res);

  return res;
};

/**
 * 有道词典 API。
 * @param {string} text 查询单词
 * @returns {Promise<Object|null>} 有道词典的 JSON 响应数据
 */
export const apiYoudaoDict = async (text) => {
  const params = {
    doctype: "json",
    jsonversion: 4,
  };
  const input = `https://dict.youdao.com/jsonapi_s?${queryString.stringify(params)}`;
  const body = queryString.stringify({
    q: text,
    le: "en",
    t: 3,
    client: "web",
    keyfrom: "webdict",
  });
  const init = {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja;q=0.6",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body,
  };
  const res = await fetchData(input, init, { useCache: true });

  if (res) {
    await putHttpCachePolyfill(input, init, res);
    return res;
  }

  return null;
};
