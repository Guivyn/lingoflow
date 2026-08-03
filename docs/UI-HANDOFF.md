# LingoFlow UI 交接文档（2026-08-02）

> 给新开的改进窗口看的入口文档。改任何视觉之前先读 `DESIGN.md` 和 `CLAUDE.md`。

## 当前进度

设计方向已定：AI 阅读伴侣（Reading Companion），文档式设置页，衬线标题 + 无衬线正文 + 等宽数据，暖米白 + 陶土红。完整规范见 [DESIGN.md](../DESIGN.md)。

已经完成：

- 设计令牌：`src/ui/theme/tokens.ts`、`src/ui/theme/variables.css`
- 共享组件：`Button`、`Input`、`Select`、`Switch`、`SettingItem`、`SettingSection`、`SettingRow`
- Options 外壳：`Layout`、`Header`、`Navigator` 已迁移；头部、侧栏的线已删减
- Options 页面：基础设置、Apis、Rules、Subtitle 已迁移；Providers 已从卡片改为 `SettingSection` + `SettingRow`
- 设置行之间不再画分割线，改用留白和 hover 底色；只有分区标题保留一条轻分割线
- Popup：删除了头部下方的 `Divider`，头部增加留白
- 划词窗口：TranBox 头部去掉了 Logo 描边框，词典/联想/汉典面板里的 `Divider` 已删除
- 字体落地：思源宋体标题子集（3500 常用字 + 标点，woff2 变量字重 500-700）已打包进扩展，Options/Popup/TranBox 标题使用 `LingoFlow Serif Display`，正文保持系统无衬线
- 本机开发服务器已启动：`http://localhost:3000`，入口 `options.html` / `popup.html`

## 新窗口优先要做的事

按 `frontend-design` skill 复审后的下一步（按优先级）：

1. 建立真正的产品签名：把 `EN ⇄ 中` 语言信号和双色 Logo 用到 Options、Popup、TranBox 三个表面；当前 Options 头部已加，Popup 已换 Logo 字标，TranBox 还需补字标
2. 深色模式 QA：重点查 `Theme.js` 未映射的 `borderStrong` / `surfaceRaised`，以及 TranBox 头部、Popup fallback 的底色和文字对比
3. 文案审计：把 `csplist`、`orilist`、`clearCache` 等系统词改成用户语言；错误与空状态写“发生了什么 + 怎么修”
4. Popup / 划词窗口示例页：用真实组件 + 示例数据做一页 showcase，方便不开扩展也能验收
5. Apis 拖拽分隔线：区分“功能指示”与“装饰线”，功能分隔保留，装饰线删掉
6. 动效与可达性：hover / focus / 入场统一走 `tokens.motion`；`prefers-reduced-motion` 已全局降级，补键盘焦点与对比度检查

原有任务：

1. 复核 Options 页面残留的边框和分割线
   - `src/views/Options/Apis.js`：拖拽排序的 `borderTop` 指示、列表/编辑区之间的 `borderRight` 属于功能分隔，确认是否需要保留
   - Rules / Subtitle 的非功能边框与 `Divider` 已删掉，复查视觉即可
2. 深色模式复核
   - `src/hooks/Theme.js` 已映射设计令牌，重点检查深色下设置页、Popup、TranBox 的分割线色与文字色
3. Popup 与划词窗口统一收尾
   - Popup 头部换成与 Options 一致的字标风格（当前仍是 Home 图标 + 文本）
   - TranForm 的选择框、Tabs 下划线、DraggableResizable 的圆角与阴影按 `DESIGN.md` 对齐
4. Providers 页验证
   - 检查 TS 编译、i18n fallback 文案、未配置服务商的开关状态
5. 截图 QA
   - Options 桌面 / 移动 / 深色
   - Popup 360px
   - 划词翻译窗口带词典、AI 词典、联想三种状态
   - 参考 `design-drafts/` 下的方向图与截图
6. 跑一遍质量门
   - `pnpm lint`
   - `pnpm test:ci`
   - `pnpm build`

## 参考入口

- 设计规范：`DESIGN.md`
- QA 规则：`CLAUDE.md`
- 设计草稿与截图：`design-drafts/README.md`
- 令牌：`src/ui/theme/tokens.ts`、`src/ui/theme/variables.css`
- 设置组件：`src/ui/components/SettingSection/`、`src/ui/components/SettingRow/`、`src/ui/components/SettingItem/`
- 设置页：`src/views/Options/`
- Popup：`src/views/Popup/`
- 划词窗口：`src/views/Selection/`
- 常用命令：`package.json` 的 `start`、`build`、`test:ci`、`lint`

## 注意事项

- 工作区当前有未提交改动，先 `git status` 看清范围再动手。
- 不要在组件里散写颜色、字号、字体、间距，一律从 `tokens` 取。
- 分割线只保留语义级：分区标题、真正需要区分的浮层；行与行之间用留白。
