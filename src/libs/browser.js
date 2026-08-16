/**
 * @file browser.js
 * @description 浏览器环境桥接模块，用于引入 WebExtension Polyfill 垫片，并提供当前执行环境上下文 (Background, Options, Content Script) 的判定工具。
 */

/**
 * 尝试安全加载 webextension-polyfill
 * @returns {object|undefined} 浏览器插件 API polyfill 实例，非插件环境则返回 undefined
 */
function _browser() {
  try {
    return require("webextension-polyfill");
  } catch (err) {
    // 非扩展环境下运行时忽略报错 (如开发打包、Web 预览)
    // appLog("browser", err);
  }
}

// 统一的浏览器扩展 API 导出对象
export const browser = _browser();

/**
 * 获取当前脚本在浏览器扩展中的具体执行环境上下文
 * @returns {string} 返回 "background" | "content" | "options" | "popup" | "undefined"
 *
 */
export const getContext = () => {
  const context = globalThis.__LINGOFLOW_CONTEXT__;
  if (context) return context;

  try {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return "background";
    }
    const href = window.location.href || "";
    if (href.includes("/popup.html")) return "popup";
    if (href.includes("/options.html")) return "options";
    const extensionOrigin = browser?.runtime?.getURL
      ? browser.runtime.getURL("")
      : "";
    if (extensionOrigin && !href.startsWith(extensionOrigin)) {
      return "content";
    }
    if (href.includes("/background")) return "background";
  } catch (err) {
    // 解析失败时保留 undefined，由调用方兜底。
  }

  return "undefined";
};

// 辅助环境判定变量
export const isBg = () => getContext() === "background";
