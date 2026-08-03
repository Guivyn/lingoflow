import React from "react";
import ReactDOM from "react-dom/client";
import Options from "./views/Options";

// 本地开发默认入口：根路径直接打开设置中心。
// 扩展构建使用 config-overrides 覆盖为 options/popup/content 入口，不引用本文件。
globalThis.__LINGOFLOW_CONTEXT__ = "options";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
