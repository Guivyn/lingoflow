/**
 * @file cache.js
 * @description 本地缓存管理模块。使用浏览器的 CacheStorage 缓存翻译接口响应结果，提供高效的 POST 请求虚拟化 GET 转换技术，以及 Content 到 Background 的中转 Polyfill。
 */

import {
  CACHE_NAME,
  MSG_CLEAR_CACHES,
  MSG_GET_HTTPCACHE,
  MSG_PUT_HTTPCACHE,
} from "../config";
import { appLog } from "./log";
import { isExt } from "./client";
import { isBg } from "./browser";
import { sendBgMsg } from "./msg";
import { parseResponse } from "./response";
import { sha256 } from "./utils";
import { getSetting } from "./storage";
import { CACHE_LIMITS, normalizeNumber } from "../core/storage/constraints";

const CREATED_AT = "X-LingoFlow-Created-At";
const EXPIRES_AT = "X-LingoFlow-Expires-At";
export const DEFAULT_CACHE_MAX_ENTRIES = CACHE_LIMITS.cacheMaxEntries.fallback;
let operations = Promise.resolve();
let lastSweep = 0;
let lastPolicy = "";
const serialize = (fn) => {
  const operation = operations.then(fn);
  operations = operation.catch(() => undefined);
  return operation;
};

const readPolicy = async () => {
  const setting = await getSetting();
  return {
    maxAge: normalizeNumber(setting?.cacheMaxAge, CACHE_LIMITS.cacheMaxAge),
    maxEntries: normalizeNumber(
      setting?.cacheMaxEntries,
      CACHE_LIMITS.cacheMaxEntries
    ),
  };
};

const isExpired = (response, policy, now) => {
  const created = response.headers.get(CREATED_AT);
  const expires = response.headers.get(EXPIRES_AT);
  if (created === null || expires === null) return true;
  const createdAt = Number(created);
  const expiresAt = Number(expires);
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt < 0 ||
    expiresAt < 0
  )
    return true;
  // A shorter current policy applies immediately; extending it never revives expired entries.
  return (
    (expiresAt !== 0 && now >= expiresAt) ||
    (policy.maxAge !== 0 && now >= createdAt + policy.maxAge * 1000)
  );
};

const prune = async (cache, policy, now) => {
  const policyKey = JSON.stringify(policy);
  let keys = await cache.keys();
  if (!lastSweep || now - lastSweep >= 60000 || policyKey !== lastPolicy) {
    for (const key of keys) {
      const response = await cache.match(key);
      if (response && isExpired(response, policy, now)) await cache.delete(key);
    }
    lastSweep = now;
    lastPolicy = policyKey;
    keys = await cache.keys();
  }
  // FIFO eviction; updating a key moves it to the end in putHttpCache.
  for (const key of keys.slice(
    0,
    Math.max(0, keys.length - policy.maxEntries)
  )) {
    await cache.delete(key);
  }
};

/**
 * 清除翻译网络请求的本地缓存
 */
export const tryClearCaches = async () => {
  try {
    if (isExt && !isBg()) {
      await sendBgMsg(MSG_CLEAR_CACHES);
    } else {
      await serialize(async () => {
        await caches.delete(CACHE_NAME);
        lastSweep = 0;
        lastPolicy = "";
      });
    }
  } catch (err) {
    appLog("clean caches", err);
    throw err;
  }
};

/**
 * 构造缓存所用的 Request 对象。
 * 由于浏览器原生 CacheStorage (caches) 仅支持拦截/匹配 GET 类型的网络请求，而网页翻译接口大多使用 POST 方法。
 * 本函数通过将 POST 请求的 Body (包含待翻译原文的 JSON 字符串) 拼接在 URL 路径末尾，
 * 并将方法重置为 GET，从而实现对 POST 翻译请求的本地缓存与命中。
 * @param {string} input
 * @param {Object} init
 * @returns {Promise<Request>} 虚拟转换后的 GET 缓存 Request 对象
 */
const newCacheReq = async (input, init) => {
  let request = new Request(input, init);
  if (request.method !== "GET") {
    const body = await request.text();
    const cacheUrl = new URL(request.url);
    // 用请求体哈希作为缓存键，避免长原文拼进 URL 触发长度上限。
    const digest = await sha256(body, request.method);
    cacheUrl.pathname += `/${digest}`;
    request = new Request(cacheUrl.toString(), { method: "GET" });
  }

  return request;
};

/**
 * 查询本地 CacheStorage 中是否缓存了该请求的翻译结果
 * @param {string} input
 * @param {Object} init
 * @param {string} [expect] 预期的解析格式 (如 json/text 等)
 * @returns {Promise<*>} 缓存的数据，若无缓存返回 null
 */
export const getHttpCache = ({ input, init, expect }) =>
  serialize(async () => {
    try {
      const request = await newCacheReq(input, init);
      const cache = await caches.open(CACHE_NAME);
      const policy = await readPolicy();
      await prune(cache, policy, Date.now());
      const response = await cache.match(request);
      if (response) {
        if (isExpired(response, policy, Date.now())) {
          await cache.delete(request);
          return null;
        }
        const res = await parseResponse(response, expect);
        return res;
      }
    } catch (err) {
      appLog("get cache", err);
    }
    return null;
  });

/**
 * 将成功请求回来的翻译数据及语种缓存写入 CacheStorage 中
 * @param {string} input
 * @param {Object} init
 * @param {Object} data 待缓存的数据
 * @param {number} [maxAge=DEFAULT_CACHE_TIMEOUT] 缓存有效期 (秒)
 */
export const putHttpCache = ({ input, init, data, maxAge }) =>
  serialize(async () => {
    try {
      const req = await newCacheReq(input, init);
      const cache = await caches.open(CACHE_NAME);
      const policy = await readPolicy();
      const ttl = normalizeNumber(maxAge, {
        ...CACHE_LIMITS.cacheMaxAge,
        fallback: policy.maxAge,
      });
      const createdAt = Date.now();
      const res = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": ttl === 0 ? "no-cache" : `max-age=${ttl}`,
          [CREATED_AT]: String(createdAt),
          [EXPIRES_AT]: String(ttl === 0 ? 0 : createdAt + ttl * 1000),
        },
      });
      await cache.delete(req);
      await cache.put(req, res);
      await prune(cache, policy, createdAt);
    } catch (err) {
      appLog("put cache", err);
    }
  });

/**
 * getHttpCache 的跨环境包装层，若是 Content Script 会交由 Background 查询
 * @param {string} input
 * @param {Object} init
 * @returns {Promise<*>}
 */
export const getHttpCachePolyfill = (input, init) => {
  // 插件前端：发送消息查询
  if (isExt && !isBg()) {
    return sendBgMsg(msgGetCacheName(), { input, init });
  }

  // 后台端点：直接本地查询
  return getHttpCache({ input, init });
};

/**
 * 辅助获取消息键名函数，防止常量导入死锁
 */
function msgGetCacheName() {
  return MSG_GET_HTTPCACHE;
}

/**
 * putHttpCache 的跨环境包装层，若是 Content Script 会交由 Background 写入
 * @param {string} input
 * @param {Object} init
 * @param {Object} data
 * @returns {Promise<void>}
 */
export const putHttpCachePolyfill = (input, init, data) => {
  // 插件前端：发送消息写入
  if (isExt && !isBg()) {
    return sendBgMsg(MSG_PUT_HTTPCACHE, { input, init, data });
  }

  // 后台端点：直接本地写入
  return putHttpCache({ input, init, data });
};
