# P4 Options 设计系统：现状、清理点与后续计划

> 本文用于交接：新窗口读这一份即可了解当前进度、已做改进、待清理项和下一步。

## 1. 当前状态

- 基线：原版 `main`（`03f18e1`）。
- 当前分支：`feature/options-design-system`。
- 已有 6 个 commit，全部通过 `tsc`、eslint、全量测试（42 suites / 284 tests）和生产构建。
- 相对原版改动 30 个文件，`+2076 / -913` 行。
- `docs/` 已随清理提交；分支未 push。
- 翻译核心链路（`apis`、`translator`、`scanner`、`renderer`、`background`、`content`）没有被改动。

### 已有 commit

```text
0b12196 feat: redesign provider settings page
fffe0f6 refactor: migrate language settings page
2e3b039 feat: introduce config schema and migration
0d1ac1d feat: add design system primitives
9814c9a feat: introduce options architecture
a2c08fa chore: enable typescript
```

## 2. 已完成的改进与结果

1. **TS 基础**
   - 新增 `tsconfig.json`：`allowJs: true`、`checkJs: false`、`strict: true`、`noEmit: true`。
   - 依赖：`typescript 5.9.3`、`@types/react 18`、`@types/react-dom 18`、`@types/node 18`、`@types/jest 27`、`@types/chrome`。
   - lint 已覆盖 `.js/.jsx/.ts/.tsx`。
   - 结果：新代码可以进入 CRA 编译链路，旧 JS 继续共存，不会被历史 `any` 一次压垮。

2. **`src/ui` 设计系统层**
   - `src/ui/theme/tokens.ts` + `variables.css`：颜色、间距、圆角、阴影、字号、布局、z-index 收敛。
   - `src/ui/components/`：Button、Switch、Select、Input、Card、SettingItem。
   - `src/ui/index.ts` 作为统一导出入口。
   - 结果：页面不再直接散写 MUI 样式；以后换 Radix/Tailwind 只动 `src/ui` 内部。

3. **存储迁移收敛**
   - `src/core/storage/migrations.ts`：`SETTINGS_MIGRATIONS` 版本表 + `runSettingMigrations` 链式执行。
   - `CURRENT_SETTINGS_VERSION` 与 `SETTINGS_SCHEMA_VERSION` 对齐。
   - `src/libs/storage.js`、`src/hooks/Setting.js` 不再散落 `if (version < x)`。
   - 结果：新增 `migrations.test.ts`、`storage.test.js`，迁移行为有测试兜底。

4. **类型契约先行**
   - `src/core/storage/types.ts`：`Setting`、`ProviderConfig`、`Config`、`LanguageConfig`、`RendererConfig`、`RulesConfig`。
   - `src/providers/types.ts`：`TranslationProvider` 目标接口，贴着现有 Registry 真实契约定义。
   - 结果：Options 与 Storage / Provider 有了共享契约，但没有改变现有扁平存储结构。

5. **Options 页面迁移**
   - `Layout.js -> Layout.tsx`。
   - `Setting.js -> Setting.tsx`，新增 `LanguageSettings.tsx`，`uiLang` / `skipLangs` 已切到 `src/ui`。
   - 新增 `Providers.tsx`：直接对接 Provider Registry 与 `transApis`，保留 `/apis` 高级页入口。
   - 新增 `/providers` 路由和侧边栏入口。
   - 结果：设置页可打开，Language 和 Provider 是第一批设计系统落地页面。

6. **测试**
   - 新增 5 个测试文件：ui 组件（Switch、SettingItem）、storage、migrations、Providers。
   - 最终 42 suites / 284 tests 全部通过。

## 3. 最干净简洁的目标形态

```text
src/
├─ ui/                       # 唯一 UI 出口
│  ├─ components/            # Button/Card/Input/Select/Switch/SettingItem
│  ├─ theme/tokens.ts        # 现有 token 已够用，按需补 animation/breakpoint
│  ├─ variables.css          # 只在 ui 或 Options 根入口 import 一次
│  └─ index.ts
├─ core/storage/
│  ├─ schema.js
│  ├─ migrations.ts          # 版本表 + 链式执行
│  └─ types.ts               # Setting / ProviderConfig / Config
├─ providers/
│  └─ types.ts               # TranslationProvider
└─ views/Options/
   ├─ Layout.tsx
   ├─ LanguageSettings.tsx   # 新代码，TSX
   ├─ Providers.tsx          # 新代码，TSX
   ├─ Setting.js             # 旧页面，只换 src/ui 组件
   ├─ Rules.js / StylesSetting.js / Tranbox.js
   │  / MouseHover.js / Subtitle.js / Apis.js
   └─ index.js / Navigator.js
```

原则：

- `src/ui` 是页面唯一 UI 来源。
- storage/provider 是稳定类型契约。
- 旧页面不强制转 TSX，只做组件替换。
- 新页面统一 `.tsx`。

## 4. 四个待清理点

1. **`pnpm-lock.yaml` 噪音**
   - 当前相对原版改了 1707 行（`+895 / -812`），大部分是 pnpm 11 重解析产生的 peer 后缀噪音。
   - 原仓库由 pnpm 9.14.4（`.pnpm-version`）生成锁文件。
   - 干净做法：切回 pnpm 9.14.4 重装依赖，让锁文件 diff 尽量小；如果环境不支持，至少明确记录这个噪音来源。
   - 执行记录（2026-08-02）：尝试用 pnpm 9.14.4 重生成锁文件，但当前 `pnpm-workspace.yaml` 缺少 pnpm 9 要求的 `packages` 字段，并包含 pnpm 10+ 的 `allowBuilds` 键，pnpm 9.14.4 直接报 `packages field missing or empty`。因此锁文件仍由 pnpm 11.18.0 生成，peer 后缀噪音作为已知来源保留。

2. **`Setting.tsx` 的类型收窄层**
   - 当前为了强转 TSX 写了 15 处 `as unknown as`，是纯类型噪音。
   - 干净做法：把 `Setting.tsx` 退回 `Setting.js`，只做组件替换；`LanguageSettings.tsx` 作为新代码保留 TSX。

3. **`docs/` 未跟踪**
   - 工作区一直显示 `?? docs/`。
   - 处理方式二选一：提交进仓库，或明确移出项目目录。
   - 已处理：选择提交进仓库。

4. **主题不要提前扩张**
   - `tokens.ts` 已经有 `color / spacing / radius / shadow / font / layout / zIndex`。
   - `animation`、`breakpoint`、`useTheme.ts`、`common.css` 等用到再补，不为未来需求提前建空壳。

## 5. 路线图调整

```text
必要：
Phase 4.2  Options 页面 UI 统一

可选（仅文档化）：
Phase 2    Scanner/Renderer 的两个真实契约，不改变运行逻辑

已砍掉：
Phase 3    全仓库 TS 化

发布前：
Rename     kiss-translator -> lingoflow，最后做
```

结论：

- Phase 2 不是当前必需，真正需要的契约只有两个，见下一节。
- Phase 3 全仓库 TS 化没有用户价值，直接砍掉，不做。
- Rename 永远放 Release 前最后一步。

## 6. Phase 2 真正需要的契约

只有两个：

- **Scanner 输出什么**：`{ text, element }` 结构
- **Renderer 接收什么**：同样的结构，再加上翻译结果

```ts
// Scanner 输出：交给 Renderer 的原文块
type ScanResult = {
  text: string;
  element: Element;
};

// Renderer 输入：原文块 + 翻译结果
type RenderInput = ScanResult & {
  translation: string;
};
```

说明：

- 这两个模块目前用 JS 写、没有显式接口，但调用关系已经很稳定。
- 给它们加 TypeScript 类型只是“文档化”，不改变任何运行逻辑。
- 当前不需要新建接口文件；等真正要动 Scanner/Renderer 时，再按这两个契约补类型即可。

## 7. Phase 4.2 页面迁移规范

迁移顺序：

```text
Setting.tsx / LanguageSettings.tsx / Providers.tsx  ✅

↓

Rules.tsx(或 .js)
StylesSetting
Tranbox
MouseHover
Subtitle

↓

Apis（最复杂，放最后）
```

规则：

- 页面不再直接 import MUI，统一从 `src/ui` 导入。
- 设置项统一用 `SettingItem` + `Card`；输入/开关/下拉/按钮用 `Input` / `Switch` / `Select` / `Button`。
- 旧页面保持 `.js` 优先，不强行 TSX；新页面 `.tsx`。
- 遇到 `CodeField`、`ValidationInput`、`ReusableAutocomplete`、`ShortcutInput`、拖拽列表等控件时，按需补进 `src/ui`，而不是让页面直接 import MUI。
- 每个页面一个 commit，保持 lint / test / build 全绿。

执行记录（2026-08-02）：Rules、StylesSetting、Tranbox、MouseHover、Subtitle、Apis 已全部迁移到 `src/ui`，旧页面保持 `.js`；`CodeField`、`ValidationInput`、`ShortcutInput`、`ReusableAutocomplete`、`ShowMoreButton` 已收进 `src/ui`。每页一个 commit，`tsc` / eslint / 全量测试（42 suites / 284 tests）/ 生产构建全绿。

## 8. Git 策略

```text
main
└── feature/options-design-system    # P4 主线，保持不动
    ├── feature/options-pages        # P4.2 剩余页面迁移
    ├── feature/core-types           # Phase 2（可选，仅文档化契约）
    └── feature/rename-lingoflow     # 最终 Rename
```

- `feature/options-pages` 从当前分支切出，每迁完一个页面合回主线，PR 小且易回滚。
- Phase 2（如果启动）与 Rename 各自独立分支，不要混在一起。

## 9. 新窗口第一步

1. 先确认是否执行第 4 节的清理：
   - 尝试用 pnpm 9.14.4 重装以减少锁文件噪音；
   - `Setting.tsx -> Setting.js` 回退；
   - 决定 `docs/` 是否提交。
2. 切分支：
   ```powershell
   git checkout feature/options-design-system
   git checkout -b feature/options-pages
   ```
3. 开始迁移剩余 Options 页面。

## 10. 常用验证命令

本环境 pnpm 直接运行可能遇到 store 路径问题，可用 `node_modules/.bin` 下的命令：

```powershell
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
.\node_modules\.bin\eslint.cmd src --ext .js,.jsx,.ts,.tsx
$env:CI='true'; .\node_modules\.bin\react-app-rewired.cmd test --watchAll=false --runInBand
$env:CI='true'; $env:REACT_APP_CLIENT='chrome'; .\node_modules\.bin\react-app-rewired.cmd build
```

开发预览：

```powershell
$env:REACT_APP_CLIENT='chrome'; .\node_modules\.bin\react-app-rewired.cmd start
```

- 设置页：`http://localhost:3000/options.html`
- 弹窗页：`http://localhost:3000/popup.html`
- 根路径 `/` 是 CRA 空占位页，白屏不是代码问题。

dev server 只用于开发预览，不参与发布构建；验证代码以 lint / test / build 为准。
