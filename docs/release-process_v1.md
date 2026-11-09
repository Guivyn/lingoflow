# 发布验证与构建

## 开发验证

`pnpm verify:dev` 允许工作区包含未提交文件。它检查 Node.js 与 pnpm 版本、发布标准和设计 token，运行关键回归套件及 Chrome 扩展冒烟验证，然后生成并核验 `build/chrome.zip`。

## 正式发布

`pnpm verify:release` 用于生成可交付的正式包。它要求 Git 工作区在开始前和构建后均无已跟踪或未跟踪的改动，Node.js 主版本符合 `.nvmrc`，pnpm 版本符合 `.pnpm-version`，发布标准和设计 token 无漂移，并且关键回归测试、Chrome 冒烟验证及 ZIP 校验全部通过。

发布运行环境须在 PATH 中解析到项目要求的 Node.js 和 pnpm。未安装在默认位置的 Chrome 可通过 `CHROME_PATH` 指定。正式流程生成的最终包位于 `build/chrome.zip`。

## 关键回归范围

`pnpm test:release` 运行翻译并发重试、流式错误回退、站点规则、MathJax 迁移、CSS 布局识别、DOM 扫描及翻译渲染相关测试。

`pnpm test:chrome` 在隔离的临时 Chrome 配置目录中加载构建后的扩展，检查 Options 页 HashRouter 导航、扩展 Service Worker 的动态 DNR 规则，以及普通网页请求的 Origin 不受扩展规则改写。测试结束后会关闭 Chrome 并清理临时配置目录。

`pnpm verify:package` 只验证已生成的 ZIP 内容与对应源码归档；它不代替开发验证或正式发布门禁。
