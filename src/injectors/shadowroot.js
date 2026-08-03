/**
 * Shadow DOM 创建拦截器
 * 用于重写原生的 Element.prototype.attachShadow 方法，以便在页面上动态创建 Shadow Root 时，
 * 能够实时捕获并向扩展主线程发送通知，启动翻译节点的重新扫描与样式表挂载。
 */
export const shadowRootInjector = () => {
  try {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (...args) {
      // 执行原生的 attachShadow 逻辑
      const root = orig.apply(this, args);

      window.postMessage(
        { type: "LINGOFLOW_SHADOW_ROOT_CREATED" },
        window.location.origin
      );
      return root;
    };
  } catch (err) {
    console.log("shadowRootInjector", err);
  }
};
