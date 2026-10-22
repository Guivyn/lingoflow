/**
 * XMLHttpRequest 拦截注入器
 * 主要用于重写原生的 XMLHttpRequest.prototype.open，拦截页面中的特定请求（例如 YouTube 的 `timedtext` 歌词/字幕接口）。
 * 拦截成功后，它会监听加载事件，并通过安全信道将字幕原始响应文本派发给上层 Content Script，以实现视频/音频双语字幕渲染。
 */
export const XMLHttpRequestInjector = () => {
  try {
    const marker = Symbol.for("lingoflow.youtube-caption-capture");
    if (window[marker]) return;
    const isCaptionUrl = (value) => {
      try {
        const url = new URL(value, window.location.href);
        return (
          url.protocol === "https:" &&
          /(^|\.)youtube\.com$/.test(url.hostname) &&
          url.pathname === "/api/timedtext"
        );
      } catch {
        return false;
      }
    };
    const publish = (url, response) => {
      if (
        !isCaptionUrl(url) ||
        typeof response !== "string" ||
        response.length > 8 * 1024 * 1024
      )
        return;
      window.postMessage(
        { type: "LINGOFLOW_XHR_DATA_YOUTUBE", url, response },
        window.location.origin
      );
    };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      const url = args[1];
      // 匹配 YouTube 的 timedtext 字幕网络请求链接
      if (typeof url === "string" && isCaptionUrl(url)) {
        this.addEventListener("load", function () {
          try {
            publish(this.responseURL, this.responseText);
          } catch {
            /* Non-text XHR is not a caption text payload. */
          }
        });
      }
      return originalOpen.apply(this, args);
    };
    if (typeof window.fetch === "function") {
      const originalFetch = window.fetch;
      window.fetch = function (...args) {
        return originalFetch.apply(this, args).then((response) => {
          if (isCaptionUrl(response.url)) {
            // Clone only: never consume the response body needed by the YouTube player.
            try {
              response
                .clone()
                .text()
                .then((text) => publish(response.url, text))
                .catch(() => {});
            } catch {
              /* Ignore non-cloneable responses. */
            }
          }
          return response;
        });
      };
    }
    window[marker] = true;
  } catch (err) {
    console.log("XMLHttpRequestInjector", err);
  }
};
