import React from "react";
import ReactDOM from "react-dom/client";
import { SettingProvider } from "./hooks/Setting";
import ThemeProvider from "./hooks/Theme";
import Popup from "./views/Popup";

// 标记当前上下文为 "popup"，方便其他共享库得知当前处于浏览器插件弹窗面板环境
globalThis.__LINGOFLOW_CONTEXT__ = "popup";

// 夸克等受限扩展环境下，未捕获的 Promise 错误不显示在页面里，这里直接渲染到弹窗底部便于排查。
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  const reason = event?.reason;
  const message =
    reason?.stack || reason?.message || String(reason || "unknown error");
  console.error("[popup-unhandled]", message);
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* 注入全局设置 Context 和主题 Context */}
    <SettingProvider context="popup">
      <ThemeProvider>
        <Popup />
      </ThemeProvider>
    </SettingProvider>
  </React.StrictMode>
);
