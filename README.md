# LingoFlow（灵语）

LingoFlow 是一款轻量 Chrome 双语翻译扩展，为网页、划词、悬停段落和 YouTube 字幕提供即时双语对照体验。

> UI 规范见 [DESIGN.md](DESIGN.md)：AI 阅读伴侣方向，衬线标题 + 无衬线正文 + 等宽数据，暖米白与陶土色体系。

## 功能

- 整页双语翻译：规则匹配 + 自动扫描 + SPA 动态监听
- 悬停翻译：行内插入或悬浮气泡两种模式
- 划词翻译：多引擎对照、英文词典、输入联想
- YouTube 字幕翻译：双语显示、句子切分、AI 分句增强
- 翻译引擎：Google、Google2、Microsoft、DeepL、DeepLX、DeepSeek、OpenAI、Custom
- 流式输出、批处理聚合、上下文记忆、自定义 Prompt 与 Hook、术语表

## 安装

1. 克隆仓库并执行 `pnpm build`
2. 打开 `chrome://extensions`，启用“开发者模式”
3. 点击“加载已解压的扩展程序”，选择 `build/chrome` 目录

## 快捷键

- `Alt+K` 打开设置弹窗
- `Alt+Q` 切换整页翻译
- `Alt+S` 打开划词翻译面板
- `Alt+C` 切换译文样式

## 开发

```bash
pnpm install
pnpm test
pnpm build
```

## 许可证

GPL-3.0
