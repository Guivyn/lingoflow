# LingoFlow · 灵语

[中文](README.md) · [English](README.en.md)

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="LingoFlow 灵语：保留原文，随时对照译文。网页、划词与 YouTube 字幕。">
</p>

**一款开源的 Chrome 双语阅读扩展。** 在网页中直接对照原文与译文，也支持选中文字、悬停段落和 YouTube 双语字幕。

[**下载 Chrome 安装包 →**](https://github.com/Guivyn/lingoflow/releases/latest) · [安装说明](#安装开始阅读) · [反馈问题](https://github.com/Guivyn/lingoflow/issues)

## 按你的阅读习惯设置

选择语言与翻译服务，切换双语或仅译文。更多参数收进高级设置，需要时再展开。

<p align="center">
  <img src="./assets/readme/screenshots/settings-light.png" width="100%" alt="LingoFlow 设置中心实拍：语言、翻译服务、显示方式与悬浮按钮设置。">
</p>

<details>
  <summary>查看深色主题</summary>

  <p align="center">
    <img src="./assets/readme/screenshots/settings-dark.png" width="100%" alt="LingoFlow 深色设置中心实拍。">
  </p>
</details>

## 从一页外文开始

- **整页阅读**：可见内容优先，流式接口逐步显示译文，保留原文对照。
- **随手查词**：选中或悬停文字，在当前页面查看翻译，也支持词典查询与输入联想。
- **跟上视频**：YouTube 双语字幕，支持分句与样式设置；AI 分句是可选增强。[字幕实现](docs/youtube-translation.md)
- **设好默认行为**：网站规则、动态页面监听与可选的自动翻译，适配不同站点。[自动翻译说明](docs/auto-translation.md)

## 安装，开始阅读

1. 下载 [最新版 Release](https://github.com/Guivyn/lingoflow/releases/latest) 中的 <code>chrome.zip</code> 并解压。
2. 打开 <code>chrome://extensions</code>，启用“开发者模式”，点击“加载已解压的扩展程序”。
3. 选择解压目录。打开外文网页，点击扩展图标，或按 <code>Alt+S</code> 开始翻译。

默认配置使用 Microsoft 内置端点，可先直接试用；其他服务可能需要 API Key 或 Endpoint。更新已有安装时，将文件覆盖到原扩展目录，再重新加载原扩展条目。

## 稳定性与兼容范围

请求支持后台取消、并发上限和按错误类型重试。缓存区分有效配置与完整上下文，读取时执行有效期和条目数量限制。通用设置、网站规则和悬浮按钮使用统一的保存失败反馈。

详细说明见 [缓存策略](docs/cache-policy.md)、[性能基线](docs/performance/README.md) 与 [上游兼容范围](docs/upstream-integration.md)。性能基线使用可重复的模拟服务，不代表真实接口的实测提速。本版本未包含本地 AI、音频转写、PDF/EPUB/图片翻译及服务插件运行时。

当前版本改进见 [Release 说明](https://github.com/Guivyn/lingoflow/releases/latest)。大版本升级沿用现有存储命名空间，保留已有本地配置和规则。

## 翻译引擎与配置

- **机器翻译**：Google、Microsoft、DeepL、DeepLX。
- **AI 翻译**：DeepSeek、OpenAI、Custom，可按接口能力使用流式输出、批处理聚合、上下文记忆、Prompt 和 Hook。

自定义翻译接口的接入与 Hook 说明见 [docs/custom-api_v2.md](docs/custom-api_v2.md)。界面设计规范见 [docs/DESIGN.md](docs/DESIGN.md)。

## 快捷键

| Chrome 全局快捷键 | 作用 |
| --- | --- |
| `Alt+K` | 打开扩展弹窗 |
| `Alt+S` | 切换整页翻译 |
| `Alt+C` | 切换译文样式 |

全局快捷键以 `chrome://extensions/shortcuts` 中显示的绑定为准；页面级快捷键和划词快捷键可以在扩展设置中自定义。

## 权限与数据

- 扩展需要 `<all_urls>` 权限，才能读取并在任意网页中插入双语译文；`storage`、`scripting` 和右键菜单权限分别用于配置保存、页面注入和上下文操作。
- 翻译文本会发送给当前选择的翻译服务。不同服务的 Endpoint、API Key 和数据保留政策不同，请在启用前自行确认。
- 配置项和翻译缓存由浏览器本地存储管理；不要把 API Key 放进截图、Issue 或日志中。

## 开发

<!-- release-standard:start -->
**v2.0.0** · Node.js **22** · pnpm **11.18.0**
<!-- release-standard:end -->

工具链以 [`.nvmrc`](.nvmrc) 和 [`.pnpm-version`](.pnpm-version) 为准，上方版本区块按发布规范自动生成。参见 [交付规范](docs/release-standard.md)。

```bash
git clone https://github.com/Guivyn/lingoflow.git
cd lingoflow
pnpm install
pnpm start       # 本地开发，入口为 Options 设置页
pnpm test        # 单元测试
pnpm test:ci     # 单次、非交互测试
pnpm lint        # ESLint
pnpm build       # 构建 Chrome 扩展，产物输出到 build/chrome/
```

构建后在 Chrome 中加载 `build/chrome/`。运行 `pnpm build+zip` 生成 `build/chrome.zip`、SHA-256 校验文件与构建报告。[CI](https://github.com/Guivyn/lingoflow/actions/workflows/ci.yml) 执行检查并保留构建产物。

## 反馈与贡献

- [报告 Bug](https://github.com/Guivyn/lingoflow/issues/new?template=bug_report.md)
- [提出功能建议](https://github.com/Guivyn/lingoflow/issues/new?template=feature_request.md)
- 其他讨论可以前往 [Issues](https://github.com/Guivyn/lingoflow/issues)。

## 致谢

LingoFlow 的核心代码借鉴自 [fishjar/kiss-translator](https://github.com/fishjar/kiss-translator)（GPL-3.0）。
我们在此基础上重写了页面扫描、规则匹配、译文渲染、YouTube 字幕管线与全新 UI 设计系统。
感谢 fishjar 与 kiss-translator 社区的开源贡献。

## 许可证

[GPL-3.0](LICENSE)
