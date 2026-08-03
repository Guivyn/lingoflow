# LingoFlow 显示效果提升方案与执行记录

> 入口文档：改视觉前先读 `DESIGN.md` 与 `CLAUDE.md`。本文记录从 2026-08-02 起执行的显示效果提升方案。

## 1. 目标

把「AI 阅读伴侣」的视觉语言从设置界面下沉到用户每天真正看到的显示面：

- 页内双语译文：安静、可读、跟随明暗模式。
- YouTube 字幕浮层：玻璃质、分层、不抢戏。
- 划词窗口 / Popup：收尾设计系统迁移，去掉残留的硬编码颜色。
- 设置页：译文样式变成所见即所得。

## 2. 现状问题

1. Options / Popup / TranBox 已迁移到 `src/ui` 设计令牌，但页内译文仍由 `src/libs/style.js` 用旧色值（`#209CEE` 等）生成样式，无法跟随明暗模式。
2. 译文样式表通过 `@emotion/css` 注入全局 `<style>`，又在 Shadow DOM 用 `adoptedStyleSheets` 注入第二份，产生双重样式与性能冗余。
3. 字幕默认样式仍是纯黑半透明 + 粗黑 `text-shadow`，与新的阅读伴侣气质不符。
4. TranBox 头部按钮的 hover 使用多种彩色，视觉噪声大；译文结果仍渲染成可编辑的 `TextField`，阅读感弱。
5. 内置译文样式在设置页只展示源码，用户无法直观对比每种样式的效果。

## 3. 执行方案

### 3.1 显示令牌下沉

- 在 `src/ui/theme/tokens.ts` 与 `variables.css` 增加 `translation`、`subtitle`、`dark` 语义组。
- 页内译文样式统一使用 CSS 变量（如 `--lf-tr-color`、`--lf-tr-soft`），由 Renderer 根据 `darkMode` 在 wrapper 上设置变量值，浅色/深色页面自动适配。
- 移除 `src/libs/style.js` 对 `@emotion/css` 的依赖，改用确定性类名 `lingoflow-tr-*`，只生成一份样式表并注入 Shadow DOM。

### 3.2 页内译文

- 保留全部历史 `styleSlug`，保证已保存配置兼容。
- 内置样式颜色改为陶土红语义色，线条、马克笔、引用、高亮等均支持明暗两套变量。
- 错误面板、重试图标、Loading 图标改用设计令牌，不再散写 `#209CEE` / `#F44336`。

### 3.3 字幕浮层

- 更新 `DEFAULT_SUBTITLE_SETTING` 中 `windowStyle` / `originStyle` / `translationStyle` 默认值：
  - 深色低饱和玻璃底、细边框、圆角、柔和阴影；
  - 原文次级、译文主显；
  - 保留用户自定义 CSS 的覆盖能力。
- 字幕更新加入 200ms 透明度过渡，并遵守 `prefers-reduced-motion`。
- 播放器通知气泡与按钮颜色同步设计令牌。
- 新增设置版本 v3 迁移：只替换仍等于旧版出厂默认值的字幕样式，保留用户自定义样式；字幕管理器运行时也做同款兜底。
- YouTube 播放器字幕按钮、字幕快捷菜单与划词翻译触发按钮全部换用新版双色 Logo。

### 3.4 Popup / TranBox 收尾

- TranBox 头部按钮 hover 统一为中性底色，只有激活态保留语义色。
- 译文结果从 `TextField` 改为可读的译文段落 + 复制按钮，保持流式更新与换行处理。

### 3.5 设置页样式画廊

- `StylesSetting` 增加内置样式画廊：每种样式用双语段落卡片实时预览，不再只有源码。

### 3.6 Showcase 验收

- 扩展 `src/views/Showcase`，覆盖页内译文与字幕浮层两种显示面，便于不开扩展截图 QA。

## 4. 执行记录

| 日期 | 内容 | 状态 |
| --- | --- | --- |
| 2026-08-02 | 显示令牌、页内译文 token 化、暗色适配 | 已完成 |
| 2026-08-02 | 字幕浮层默认视觉升级 | 已完成 |
| 2026-08-02 | TranBox / Popup 显示收尾 | 已完成 |
| 2026-08-02 | StylesSetting 样式画廊 | 已完成 |
| 2026-08-02 | Showcase 扩展 | 已完成 |
| 2026-08-02 | YouTube / 划词图标换新 Logo，字幕样式 v3 迁移 | 已完成 |
| 2026-08-02 | 网页翻译 flex/grid 布局修复：译文不再作为独立布局子项 | 已完成 |
| 2026-08-02 | Popup 状态同步修复：优先读取内容脚本实时规则 | 已完成 |
| 2026-08-02 | 译文样式优化：移除模糊/闪现，新增纸感高亮/弱化/斜体/加粗 | 已完成 |
| 2026-08-02 | 译文样式清理：移除马克笔/渐变马克笔，长译文与原文分行、译文内部不再拆行 | 已完成 |
| 2026-08-02 | 译文样式再打磨：新增侧栏，渐变改品牌暖色，动画尊重 reduced-motion，画廊预览支持明暗 | 已完成 |
| 2026-08-02 | GitHub 内置规则放开 line-clamp/高度限制，修复译文与正文重叠 | 已完成 |
| 2026-08-02 | Popup 新增持久化“英文自动翻译”开关；译文固定独立成行，压缩样式内边距 | 已完成 |
| 2026-08-02 | 通用扫描规则：跳过标签/徽章/chip/面包屑等 UI 元素与标识类字符串；StackOverflow 补充专用规则；恢复短译文行内显示 | 已完成 |
| 2026-08-02 | Popup 规则开关与译文样式选择持久化到本地存储 | 已完成 |
| 2026-08-03 | 字体落地：思源宋体（Noto Serif SC）标题子集 woff2，3500 常用字 + 常用标点，Options/Popup/TranBox 标题本地加载，正文保持系统无衬线 | 已完成 |

## 5. 后续（暂缓项）

以下项需要更大范围 i18n，未在本轮执行，留待后续：

1. **新增译文样式（部分完成）**：`paper highlight`、`weakening`、`italic`、`bold` 已落地；`side rail`、`ghost` 等仍可后续补充，需要新增 `styleSlug`、i18n 文案与迁移兼容。

## 6. 验证

每阶段保持：

```powershell
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
.\node_modules\.bin\eslint.cmd src --ext .js,.jsx,.ts,.tsx
$env:CI='true'; .\node_modules\.bin\react-app-rewired.cmd test --watchAll=false --runInBand
$env:CI='true'; $env:REACT_APP_CLIENT='chrome'; .\node_modules\.bin\react-app-rewired.cmd build
```
