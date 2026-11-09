# KISS Translator 兼容性

核对日期：2026-11-08。上游仓库为 [fishjar/kiss-translator](https://github.com/fishjar/kiss-translator)。稳定版基点为 `v2.1.1 / a1279f2517bd478ef1dd93b941f9177094486cd4`，开发版当前基点为 `fae9e95a6a23e5fed28ff71e53a1218c4549ede7`。

本项目当前兼容范围为网页翻译、划词翻译与 YouTube 字幕。下表记录与这些模块直接相关的兼容状态；上游其他客户端和新运行时不属于当前产品范围。

## 当前兼容状态

| 上游变更                                                                                                                | 本项目当前状态                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [翻译分组失败隔离](https://github.com/fishjar/kiss-translator/commit/1cde06231a9bef71d216cbd99712b47e186171f5)          | 每个请求持有自己的译文 wrapper；失败提示和重试仅作用于该分组，不查找宿主下最后一个 wrapper。                       |
| [Origin 改写限制到扩展请求](https://github.com/fishjar/kiss-translator/commit/48a777a3865e3cfb08d891e4341c566b5e58006a) | DNR 规则通过扩展发起方域名匹配请求；网页自身发出的请求不改写 Origin。                                              |
| [MathJax 公式保护](https://github.com/fishjar/kiss-translator/commit/253f422b1d6183cc11b05fb819bf03e916f68d90)          | `.MathJax` 作为保留元素，`.MathJax_Display` 作为忽略元素；已有非空全局选择器以一次性迁移补齐，保留站点规则、显式排除和空选择器。 |

## 当前范围之外

- 本地 AI、Provider 插件运行时、PDF/EPUB/图片翻译和文件工作区不属于当前产品模块。
- 上游新增接口和设置工作流不会自动替换本项目现有 Provider、存储或请求生命周期。

## 验证边界

构建与静态检查可验证代码和扩展产物结构。Origin 规则在真实 Chrome 请求中的发起方匹配，以及 MathJax CHTML/SVG 页面布局，仍需在浏览器中确认；它们不能由静态代码检查证明。
