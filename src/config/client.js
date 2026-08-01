/**
 * @file client.js
 * @description 客户端类型常量定义模块，当前只保留 Chrome 扩展环境。
 */

export const CLIENT_CHROME = "chrome"; // Chrome 扩展程序

// 浏览器扩展类客户端的集合
export const CLIENT_EXTS = [CLIENT_CHROME];

// 默认 User-Agent，在某些防爬虫的机器翻译 API 请求时作为 Headers 模拟浏览器发送
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
