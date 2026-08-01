const paths = require("react-scripts/config/paths");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

console.log("process.env.REACT_APP_CLIENT", process.env.REACT_APP_CLIENT);

// Chrome 扩展专用 Webpack 配置 (Popup, Options, Background, Content Scripts)
const extWebpack = (config, env) => {
  const isEnvProduction = env === "production";
  // 生产环境下 HTML 及 JS/CSS 压缩选项
  const minify = isEnvProduction && {
    removeComments: true,
    collapseWhitespace: true,
    removeRedundantAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeStyleLinkTypeAttributes: true,
    keepClosingSlash: true,
    minifyJS: true,
    minifyCSS: true,
    minifyURLs: true,
  };
  // 需要在默认 react-scripts 中被排除替换的插件类名
  const names = [
    "HtmlWebpackPlugin",
    "WebpackManifestPlugin",
    "MiniCssExtractPlugin",
  ];

  // 1. 定义扩展程序的多入口打包策略，避免多处散装注入
  config.entry = {
    popup: paths.appSrc + "/popup.js", // 扩展弹出页面
    options: paths.appSrc + "/options.js", // 扩展设置页面
    background: paths.appSrc + "/background.js", // 扩展后台常驻脚本
    content: paths.appSrc + "/content.js", // 内容注入核心脚本
    "injector-subtitle": paths.appSrc + "/injector-subtitle.js", // 字幕注入脚本
    "injector-shadowroot": paths.appSrc + "/injector-shadowroot.js", // ShadowRoot 拦截注入脚本
  };

  // 2. 将输出的文件命名重写为固定格式，方便 manifest.json 静态引用，防止文件哈希化导致引用失效
  config.output.filename = "[name].js";
  config.output.assetModuleFilename = "media/[name][ext]";

  // REVIEW: 在 Webpack 5 环境下只设置 default: false 依然有触发 vendors 分包切片的可能，更安全的做法是直接设为 false 或显式清空 vendors 缓存组
  config.optimization.splitChunks = { cacheGroups: { default: false } };
  config.optimization.runtimeChunk = false; // 禁用 runtime 独立分包

  // 3. 过滤掉原本 react-scripts 针对单页应用的插件实例
  config.plugins = config.plugins.filter(
    (plugin) => !names.includes(plugin.constructor.name)
  );

  // 4. 重新注入为扩展程序定制的配置
  config.plugins.push(
    // 为设置页定制生成对应的 HTML
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["options"],
      template: paths.appHtml,
      filename: "options.html",
      minify,
    }),
    // 为弹出菜单定制生成对应的 HTML
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["popup"],
      template: paths.appHtml,
      filename: "popup.html",
      minify,
    }),
    new WebpackManifestPlugin({
      fileName: "asset-manifest.json",
    }),
    new MiniCssExtractPlugin({
      filename: "css/[name].css",
    })
  );

  return config;
};

module.exports = {
  webpack: extWebpack,
  devServer: (configFunction) => (proxy, allowedHost) => {
    const config = configFunction(proxy, allowedHost);
    const onBeforeSetupMiddleware = config.onBeforeSetupMiddleware;
    const onAfterSetupMiddleware = config.onAfterSetupMiddleware;
    const setupMiddlewares = config.setupMiddlewares;

    if (onBeforeSetupMiddleware || onAfterSetupMiddleware) {
      config.setupMiddlewares = (middlewares, devServer) => {
        if (onBeforeSetupMiddleware) onBeforeSetupMiddleware(devServer);
        const nextMiddlewares = setupMiddlewares
          ? setupMiddlewares(middlewares, devServer)
          : middlewares;
        if (onAfterSetupMiddleware) onAfterSetupMiddleware(devServer);
        return nextMiddlewares;
      };
      delete config.onBeforeSetupMiddleware;
      delete config.onAfterSetupMiddleware;
    }

    return config;
  },
};
