# Design System — LingoFlow

## Product Context

- **What this is:** LingoFlow（灵语），面向网页、划词、悬停段落与 YouTube 字幕的轻量双语翻译 Chrome 扩展。
- **Who it's for:** 高频阅读外文网页、需要即时双语对照的用户；设置页的使用者是愿意配置翻译引擎和规则的高级用户。
- **Space/industry:** 翻译工具 / AI 阅读伴侣；同类体验参考 Arc、Notion、Raycast、Linear、Readwise 与 macOS 设置。
- **Project type:** Chrome 扩展，含 Options 设置中心、Popup、划词气泡与字幕浮层。

## Aesthetic Direction

- **Direction:** AI 阅读伴侣（Reading Companion）
- **Decoration level:** minimal，装饰只出现在两个地方：双色块 Logo 与页面顶部的 EN ⇄ 中 语言信号
- **Mood:** 温暖、安静、书籍感、轻量。像一本排印讲究的书，而不是企业后台。
- **Reference sites:** Arc Browser Settings、Notion Settings、Raycast、Linear、Readwise、macOS System Settings

## Typography

字体是这套系统的第一性格。三个家族，各司其职，代码里只能通过 token 取用。

### Families

| Role | Family | 使用场景 | 加载策略 |
| --- | --- | --- | --- |
| Display / 标题 | `"LingoFlow Serif Display", Georgia, "Times New Roman", "Noto Serif SC", "SimSun", "STSong", serif` | 页面大标题、分区标题、产品字标 | 本地思源宋体 3500 常用字 woff2 子集（500-700 变量轴）；西文 Georgia，子集外回退系统衬线 |
| Body / 正文与控件 | `"Segoe UI Variable Text", "Segoe UI", "Noto Sans SC", "Microsoft YaHei UI", "Microsoft YaHei", "DengXian", sans-serif` | 正文、设置项、按钮、输入控件 | 系统无衬线；西文 Segoe UI Variable，中文优先 Noto Sans SC |
| Data / 数值与快捷键 | `"Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace` | 数值、快捷键、正则、代码输入 | 系统等宽回退即可 |

### Scale

| Token | Size | Line Height | Weight | Letter Spacing | 用途 |
| --- | --- | --- | --- | --- | --- |
| `display` | 32px | 1.2 | 600 | -0.02em | 页面大标题 |
| `section` | 20px | 1.3 | 600 | -0.01em | 设置分区标题 |
| `body` | 15px | 1.6 | 400 | 0 | 正文 |
| `control` | 14px | 1.5 | 500 | 0 | 按钮、输入、菜单 |
| `caption` | 12px | 1.5 | 400 | +0.02em | 辅助说明、分组眉题 |
| `data` | 13px | 1.5 | 400 | 0 | 数值、正则、等宽字段 |
| `keycap` | 11px | 1 | 600 | 0 | 快捷键按键 |

### Rules

1. 标题只用 Display 衬线家族；正文与控件只用 Body 无衬线家族；数值与快捷键只用 Data 等宽家族。
2. 页面大标题统一 32px / 600 / -0.02em，不再出现 18-24px 的随意标题。
3. 禁止在组件内散写 `font-family`、`font-size`、`letter-spacing`，一律从 `src/ui/theme/tokens.ts` 取。
4. 中文与英文混排时，家族回退顺序保证标题中文优先落入 `LingoFlow Serif Display`、正文中文落入 Noto Sans SC，西文落入 Georgia/Segoe UI。

## Color

- **Approach:** restrained，一个主色 + 两个语义色，颜色出现的地方都有含义。

### Light

| Token | Hex | 用途 |
| --- | --- | --- |
| background | `#FAF8F5` | 页面底，暖米白 |
| surface | `#FFFEFC` | 浮层、输入底色 |
| surface-muted | `#F3EFE8` | 悬停、导航选中底 |
| text | `#2A2723` | 主文字 |
| text-secondary | `#6F6A61` | 次级文字 |
| text-disabled | `#A29B8F` | 弱化文字 |
| line | `#EAE4DA` | 分割线 |
| line-strong | `#D8D0C2` | 强调分割线、控件描边 |
| primary | `#C96A4A` | 陶土红，主操作、激活、译语信号 |
| primary-strong | `#B2583B` | 主色 hover |
| primary-soft | `#F7ECE5` | 译文高亮底 |
| success / green | `#557A6A` | 墨绿，在线、成功、实时同步 |
| green-soft | `#EAF1EC` | 墨绿弱底 |
| blue | `#2F5BD9` | Logo 源语色、EN 标记 |
| blue-soft | `#EEF1FB` | 源语弱底 |
| warning | `#D97706` | 警告 |
| danger | `#C0392B` | 错误 |

### Dark

在深色下降低饱和度：背景 `#1B1915`、surface `#232019`、surface-muted `#2A261F`、文字 `#EFEAE1`、分割线 `#332F28`；主色提亮为 `#D08263`，墨绿 `#7BA28F`，蓝 `#7C96E8`。

## Spacing

- **Base unit:** 4px
- **Density:** comfortable，比原版放宽，设置行高不小于 44px
- **Scale:** 2(2) xs(4) sm(8) md(12) lg(16) xl(24) xxl(32) 3xl(48) 4xl(64)

## Layout

- **Approach:** grid-disciplined，设置页是文档，不是卡片集合
- **Grid:** 内容区两列参数网格，断点以下退化为单列
- **Max content width:** 1080px
- **Sidebar:** 236px；导航按 `General / Translation / Display` 分组，英文小标题 + 中文菜单
- **Header:** 58px；左为字标，右为状态、命令键与主题切换
- **Radius:** sm 4px、md 8px、full 999px；不出现 16px+ 的圆角卡片

## Motion

- **Approach:** minimal-functional，只有帮助理解的状态变化
- **Duration:** hover 160ms、入场 450ms（最多）、状态切换 200ms
- **Easing:** 统一 `cubic-bezier(0.2, 0.7, 0.2, 1)`
- `prefers-reduced-motion` 下关闭所有入场动画

## Component Semantics

- 设置页使用 `SettingSection`（标题 + 分割线 + 行控件），不再堆 `Card`。
- `Card` 只保留给 Popup、划词气泡、Live Preview 等真正需要浮层语义的地方。
- 设置行之间不画分割线，靠 12px 以上留白区分；只有分区标题保留一条轻分割线。
- 设置行控件默认无边框，hover 给浅底色，focus 才出现一条陶土色细线。

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-08-02 | 从企业后台感改为「AI 阅读伴侣」方向 | 产品是双语阅读工具，不是 SaaS 后台；降低密度与边界重量 |
| 2026-08-02 | 设置页用分割线替代卡片 | 视觉更轻，信息层级更接近 macOS/Notion 设置 |
| 2026-08-02 | 字体统一为衬线标题 + 无衬线正文 + 等宽数据 | 消除散写字体；衬线给书籍感，正文保持可读性 |
| 2026-08-02 | 整体字号与组件尺寸上调一档 | 用户明确要求，提升可读性与舒适度 |
| 2026-08-02 | 主色定为陶土红，配墨绿与 Logo 蓝 | 与双色块 Logo 同源；颜色少而含义清晰 |
| 2026-08-02 | 删除设置行、导航、头部与浮层内部的分割线 | 用户反馈线太多；改由留白与 hover 底色承担分组，信息密度下调一档 |
