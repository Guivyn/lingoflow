# LingoFlow（灵语）

[中文](README.md) · [English](README.en.md)

**v1.3.0** · [下载最新版](https://github.com/Guivyn/lingoflow/releases/latest) · [查看 CI](https://github.com/Guivyn/lingoflow/actions/workflows/ci.yml)

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="LingoFlow 灵语：面向网页的双语阅读扩展，支持整页、划词、悬停和 YouTube 字幕">
</p>

LingoFlow 是一款轻量、开源的 Chrome 双语阅读扩展。它把网页、选中文本、悬停段落和 YouTube 字幕变成可以随时对照的双语阅读体验。

## 界面预览

设置中心支持浅色与深色主题。主图展示语言、翻译参数和网站缓存配置；深色主题放在折叠区域。

<p align="center">
  <img src="./assets/readme/screenshots/settings-light.png" width="100%" alt="LingoFlow 浅色设置中心：语言、翻译参数与网站缓存配置">
</p>

<details>
  <summary>查看深色主题</summary>

  <p align="center">
    <img src="./assets/readme/screenshots/settings-dark.png" width="100%" alt="LingoFlow 深色设置中心：语言、翻译参数与网站缓存配置">
  </p>
</details>

## 30 秒上手

### 直接安装 Release 包（推荐）

1. 前往 [最新版 Release](https://github.com/Guivyn/lingoflow/releases/latest) 下载 `chrome.zip`。
2. 解压到任意本地目录，打开 `chrome://extensions` 并启用“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择解压后的目录。
4. 打开任意外文网页，点击工具栏中的 LingoFlow 图标，或使用 `Alt+S` 切换整页翻译。
5. 选中文字后使用页面上的翻译悬浮球；打开 YouTube 视频后即可使用双语字幕功能。

当前默认配置使用 Microsoft 内置翻译端点，可先直接试用。选择其他服务时，请按服务要求填写 API Key、Endpoint 或本地服务地址。

### 从源码构建

当前 CI 测试环境为 Node.js 20 与 pnpm 11.18.0；仓库通过 `.pnpm-version` 固定 pnpm 版本。

```bash
git clone https://github.com/Guivyn/lingoflow.git
cd lingoflow
pnpm install
pnpm build
```

构建产物统一输出到 `build/chrome/`，在 `chrome://extensions` 中加载该目录即可。发布打包使用 `pnpm build+zip`，产物为 `build/chrome.zip`。

## 使用场景

- **整页翻译**：自动扫描、规则匹配和 SPA 动态监听，保持文章主体的双语对照。
- **划词与悬停**：选中单词、短语或段落，使用行内译文、翻译框或悬浮气泡查看结果。
- **YouTube 字幕**：双语显示、句子切分、字幕样式和可选的 AI 分句增强。
- **词典与联想**：英文词典、输入联想和多翻译引擎对照。

## 工作方式

- 常见页面由自动扫描处理，复杂站点可以使用内置规则和 SPA 动态监听进行补充。
- 整页、划词和悬停分别使用适合阅读场景的呈现方式，互不挤在同一个弹窗里。
- 字幕翻译拥有独立的字幕处理管线；AI 分句是可选增强，不是使用 YouTube 字幕的前置条件。

## 翻译引擎与配置

- **机器翻译**：Google、Google2、Microsoft、DeepL、DeepLX。
- **AI 翻译**：DeepSeek、OpenAI、Custom，可按接口能力使用流式输出、批处理聚合、上下文记忆、Prompt、Hook 和术语表。

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

```bash
pnpm install
pnpm start       # 本地开发，入口为 Options 设置页
pnpm test        # 单元测试
pnpm test:ci     # 单次、非交互测试
pnpm lint        # ESLint
pnpm build       # 构建 Chrome 扩展，产物输出到 build/chrome/
```

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
