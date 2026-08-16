import { browser } from "../libs/browser";
import { isExt } from "../libs/client";
import { injectExternalJs, injectInlineJs } from "../libs/injector";
import { shadowRootInjector } from "./shadowroot";
import { XMLHttpRequestInjector } from "./xmlhttp";

// 注入脚本名称映射常数
export const INJECTOR = {
  subtitle: "injector-subtitle.js", // 字幕劫持注入器名称
  shadowroot: "injector-shadowroot.js", // Shadow DOM 挂载监听器名称
};

// 注入器脚本实现映射表
const injectorMap = {
  [INJECTOR.subtitle]: XMLHttpRequestInjector,
  [INJECTOR.shadowroot]: shadowRootInjector,
};

/**
 * 在目标页面环境中注入 JS 脚本
 * 扩展环境下通过扩展包内的真实外部 JS 文件 URL 注入（符合高级 CSP 限制）；
 * 其他环境（如测试环境）则将函数序列化为自执行字符串（IIFE）内联写入 DOM。
 * @param {string} name - 脚本名称
 * @param {string} [id] - 插入标签的 DOM ID 标识
 */
export function injectJs(name, id = "lingoflow-inject-js") {
  const injector = injectorMap[name];
  if (!injector) return;

  if (isExt) {
    // 扩展环境：获取打包后的脚本 URL 载入
    const src = browser.runtime.getURL(name);
    injectExternalJs(src, id);
  } else {
    // 非扩展环境（如测试环境）：将函数序列化为自执行 IIFE 字符串进行内联写入
    injectInlineJs(`(${injector})()`, id);
  }
}
