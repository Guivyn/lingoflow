import React from "react";
import ReactDOM from "react-dom/client";
import Options from "./views/Options";
import { browser } from "./libs/browser";

// 标记当前上下文为 "options"，方便其他共享库得知当前处于设置选项页环境
globalThis.__LINGOFLOW_CONTEXT__ = "options";

// 扩展页标签 favicon 显式指向内置品牌图标，避免静态链接失效或缓存导致不显示。
const faviconHref = browser?.runtime?.getURL
  ? browser.runtime.getURL("images/logo16.png")
  : "images/logo16.png";
const faviconLink =
  document.querySelector('link[rel="icon"]') ||
  (() => {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
    return link;
  })();
faviconLink.type = "image/png";
faviconLink.href = faviconHref;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
