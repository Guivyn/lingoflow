# P4 Options + Design System（调整版执行计划）

## 现状核对（新对话先确认，结论已核过）

1. Options 是 React 18，入口为 `src/options.js` -> `src/views/Options`，路由使用 `react-router-dom` HashRouter。
2. 当前 CSS 方案是 MUI v5 + Emotion（`sx` / `styled`），仓库没有 Tailwind/PostCSS 配置。
3. Storage 不是直接调 `chrome.storage`：已有 `src/libs/storage.js` 适配 `browser.storage.local` 与 `localStorage`，并有 `useStorage`、`SettingProvider`、`runDataMigration`、`src/core/storage/schema.js`（版本 2）。
4. 状态管理是 React Context（Setting/Theme/Alert/Confirm）+ `useStorage`，没有 zustand/react-query。

## 技术栈调整

- 不建议本轮引入 Tailwind + Radix。现有 MUI/Emotion 已覆盖 Button/Switch/Select/Input/Card，直接再叠一套会让 Options 同时存在两套样式系统，CRA 下还要额外接 PostCSS。
- 做法是保留 MUI/Emotion 作为底层，在 `src/ui` 里包一层业务组件，页面代码只面向 `src/ui`。以后要换 Radix/Tailwind，只动 `src/ui` 内部。
- 主题先用 `src/ui/theme/tokens.js` + `variables.css`，后续需要时再演进为 MUI theme 扩展。
- 本轮启用 TypeScript，但只要求新代码用 `.ts/.tsx`，旧代码继续保留 `.js/.jsx`，通过 `allowJs` 共存。

## TypeScript 迁移路线

### Phase 0：TS 基础（P4 第一个 commit 前完成）

安装：

```powershell
pnpm add -D typescript @types/node @types/react @types/react-dom @types/chrome
```

生成 `tsconfig.json`（CRA 模板）：

- `allowJs: true`
- `checkJs: false`
- `strict: true`
- `noEmit: true`

这一步不迁移任何旧文件，只让新 `.ts/.tsx` 可以进入 CRA 编译链路。

### Phase 1：新代码全部 TS

- P4 新增文件统一使用 `.ts` / `.tsx`。
- `src/ui/*`、新 Options 页面、新 storage 适配器用 TS 写。
- 旧 `.js/.jsx` 暂时保留，不强制迁移。

### Phase 2：优先迁移核心抽象

顺序：

1. 数据类型：先定义 `Config` / `Setting` / `ProviderConfig` 类型，让 Options 与 Storage 共享同一契约。
2. Provider 接口：先对齐现有 `src/providers/shared.js` 的真实契约（`apiSlug` / `apiType` / capabilities），再演进目标接口 `TranslationProvider`。不要凭空定义一个与 Registry 不一致的接口。
3. Scanner / Renderer：先新增 `types.ts` 定义 `ScanResult`、`RenderOptions`，实现文件 `DomScanner.js`、`TranslationRenderer.js` 后续再迁。

核心原则：先定义接口、让 JS 调用方逐步消费，不一次性重写实现。

### Phase 3：旧业务代码最后迁移

- `utils/`、`background`、`libs`、`subtitle` 等最后处理。
- 每个迁移 commit 保持 `pnpm lint`、`pnpm test:ci`、`pnpm build:ci` 全绿。

## 风险控制

- CRA 的 TS 构建会对 `tsconfig.json` 内文件做类型检查；JS 文件在 `checkJs: false` 下不会被严格检查，避免一次性爆出大量历史 `any`。
- 不要在同一 commit 里同时改数据模型和 UI。
- TS 接口先贴着现有 Registry / Storage 契约定义，避免“目标架构”和“实际实现”脱节。

## Phase 4.0：UI 基础设施

目标目录：

```text
src/
├── ui/
│   ├── components/
│   │   ├── Button/
│   │   ├── Switch/
│   │   ├── Select/
│   │   ├── Input/
│   │   ├── Card/
│   │   └── SettingItem/
│   ├── theme/
│   │   ├── tokens.js
│   │   └── variables.css
│   └── index.js
```

第一批只做 Options 需要的最小集合：`Button`、`Switch`、`Select`、`Input`、`Card`、`SettingItem`。

职责边界：

- `src/ui/*` 不直接写业务配置字段。
- `SettingItem` 接收 `title`、`description`、`children`。
- 页面组件只从 `src/ui` 导入，不直接 import MUI。
- 为 `Switch`、`SettingItem` 补基础测试。

## Phase 4.1：Config Schema + Migration（演进现有实现，不另起炉灶）

保留并演进：

```text
src/core/storage/schema.js
src/libs/storage.js
```

调整点：

- 把散落在 `SettingProvider` / `libs/storage.js` 里的 `if (version < x)` 收敛成 migration 表：`migrations[version]`，按版本链依次执行。
- 显式维护 `CURRENT_SETTINGS_VERSION`，与现有 `SETTINGS_SCHEMA_VERSION = 2` 对齐。
- 本轮不做“扁平 setting -> 嵌套 Config”的大迁移，避免 Options 重写时同时改数据模型。
- Provider 配置先保持现有 `transApis` 结构；Provider 页面重设计时再引入 `providers.configs` 并对齐 `src/providers` Registry。
- 新配置模型（`language`、`providers`、`renderer`、`rules`）可以作为目标类型先写 JSDoc/类型注释，不立即改存储。

## Phase 4.2：Options 页面迁移

顺序：

1. 先搭新 Layout：侧边栏 + 路由占位，内部仍渲染旧页面，保证设置页可打开。
2. 逐个替换页面：Language 设置优先。
3. Provider 页面最后做，直接对接现有 Provider Registry。

不要一次性重写整个 Options。

## Commit 顺序

分支：

```text
feature/options-design-system
```

每个 commit 通过：

```powershell
pnpm lint
pnpm test:ci
pnpm build:ci
```

1. `feat: introduce options architecture`
   前置 commit `chore: enable typescript`；包含 `src/ui/theme`、新 Layout 壳与路由占位，新文件使用 `.tsx`，设置页能打开。

2. `feat: add design system primitives`
   包含 Button、Switch、Select、Input、Card、SettingItem 及测试，全部 `.tsx`。

3. `feat: introduce config schema and migration`
   收敛 migration 表、版本常量与 storage 适配测试，并加入 `Config` / `ProviderConfig` 类型。

4. `refactor: migrate language settings page`
   将 Language 相关设置迁到新 `src/ui` 组件，页面文件改为 `.tsx`。

5. `feat: redesign provider settings page`
   新 Provider 页面，为 Registry 接入做准备，同时落 `TranslationProvider` 目标接口。

## Rename 继续延后

`kiss-translator -> lingoflow` 的全量改名放到 P4、Config、Provider、AI Context 之后再做。当前保留旧命名，便于 diff 和回滚。

## 新对话第一步

```powershell
git checkout -b feature/options-design-system
pnpm start
```

然后按上述 Phase 4.0 -> 4.1 -> 4.2 顺序推进，不要并行改数据模型和 UI。
