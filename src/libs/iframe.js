/**
 * 判定当前脚本是否运行在 Iframe 嵌套子页面中。
 */
export const isIframe = window.self !== window.top;

/**
 * 从当前页面向所有页面内的 iframe 子元素广播 HTML5 postMessage 消息。
 * 同源 iframe 使用具体 origin 作为 targetOrigin；跨域 iframe 无法读取其 location，
 * 只能保留通配符，但接收端会校验 event.source 与动作白名单。
 * @param {string} action 指令动作名称
 * @param {Object} args 指令参数
 */
export const sendIframeMsg = (action, args) => {
  document.querySelectorAll("iframe").forEach((iframe) => {
    const message = { action, args };
    try {
      const origin = iframe.contentWindow.location.origin;
      iframe.contentWindow.postMessage(message, origin);
    } catch (err) {
      iframe.contentWindow.postMessage(message, "*");
    }
  });
};
