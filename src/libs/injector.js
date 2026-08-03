import { trustedTypesHelper } from "./trustedTypes";

// 向宿主页面注入行内 JavaScript 脚本。
// 结合 Trusted Types 机制处理代码，兼容高安全 CSP (Content Security Policy) 要求的网站。
export const injectInlineJs = (code, id = "lingoflow-inline-js") => {
  // 避免重复注入相同 ID 的脚本
  if (document.getElementById(id)) {
    return;
  }

  const el = document.createElement("script");
  el.setAttribute("data-source", "lingoflow-inject injectInlineJs");
  el.type = "text/javascript";
  el.id = id;
  // 通过 Trusted Types 策略生成受信任的 Script
  el.textContent = trustedTypesHelper.createScript(code);
  (document.head || document.documentElement).appendChild(el);
};

// 向页面注入外部引用的 JavaScript 脚本文件。
export const injectExternalJs = (src, id = "lingoflow-external-js") => {
  if (document.getElementById(id)) {
    return;
  }

  const el = document.createElement("script");
  el.setAttribute("data-source", "lingoflow-inject injectExternalJs");
  el.type = "text/javascript";
  el.id = id;
  // 通过 Trusted Types 转换外部 script 链接，防止被严格 CSP 拦截
  el.src = trustedTypesHelper.createScriptURL(src);
  (document.head || document.documentElement).appendChild(el);
};

// 向页面注入行内 CSS 样式。
export const injectInternalCss = (styles) => {
  const el = document.createElement("style");
  el.setAttribute("data-source", "lingoflow-inject injectInternalCss");
  el.textContent = styles;
  document.head?.appendChild(el);
};
