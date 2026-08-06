/**
 * XMLHttpRequest 拦截注入器
 * 主要用于重写原生的 XMLHttpRequest.prototype.open，拦截页面中的特定请求（例如 YouTube 的 `timedtext` 歌词/字幕接口）。
 * 拦截成功后，它会监听加载事件，并通过安全信道将字幕原始响应文本派发给上层 Content Script，以实现视频/音频双语字幕渲染。
 */
export const XMLHttpRequestInjector = () => {
  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      const url = args[1];
      // 匹配 YouTube 的 timedtext 字幕网络请求链接
      if (typeof url === "string" && url.includes("timedtext")) {
        this.addEventListener("load", function () {
          // 向主应用派发字幕数据，使用了安全的原点限制 (window.location.origin)
          // 目前仅重写拦截了 `XMLHttpRequest` 对象；网页底层升级或改用 `fetch` 后该拦截可能失效。
          window.postMessage(
            {
              type: "LINGOFLOW_XHR_DATA_YOUTUBE",
              url: this.responseURL,
              response: this.responseText,
            },
            window.location.origin
          );
        });
      }
      return originalOpen.apply(this, args);
    };
  } catch (err) {
    console.log("XMLHttpRequestInjector", err);
  }
};
