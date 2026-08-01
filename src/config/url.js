/**
 * @file url.js
 * @description 应用链接与接口 URL 常量定义模块。定义本地 CacheStorage 所需的伪 HTTP URL 作为拦截 Key。
 */

import { APP_LCNAME } from "./app";

// --- 缓存拦截用的虚拟伪 URL，用于本地 Cache 系统的键名区分 ---
export const URL_CACHE_TRAN = `https://${APP_LCNAME}/translate`; // 网页正文翻译结果缓存 Key
export const URL_CACHE_SUBTITLE = `https://${APP_LCNAME}/subtitle`; // 字幕翻译结果缓存 Key
export const URL_CACHE_DELANG = `https://${APP_LCNAME}/detectlang`; // 语言判定结果缓存 Key
export const URL_CACHE_BINGDICT = `https://${APP_LCNAME}/bingdict`; // 必应词典查询结果缓存 Key
export const URL_CACHE_DICT = `https://${APP_LCNAME}/dict`; // AI 词典结果缓存 Key
export const URL_CACHE_CONTEXT = `https://${APP_LCNAME}/context`; // 智能上下文分析结果缓存 Key
