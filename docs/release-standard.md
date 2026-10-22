# 配置与发布唯一主线

本文说明入口和职责，不另行定义版本号、工具链版本或数值范围。

## 设计参数主线

`src/ui/theme/tokens.source.json` 是设计参数唯一来源。`pnpm sync:design` 生成 `tokens.ts` 与 `variables.css`，覆盖颜色、字体、间距、布局和动效。`pnpm check:design` 检查生成内容，`pnpm check:standard` 同时检查发布配置和设计参数。开发启动与构建生成派生文件，独立构建任务及安装包校验也检查同步状态。

## 配置主线

`core/storage/schema.js` 的 `normalizeSetting` 是唯一规范化入口。设置保存、通用设置对象写入（包括导入）、运行期读取和迁移结果都经过它。合法配置保持原值；非法数值按共享约束回退或截断，不支持的能力关闭。设置页显示被修正的配置字段，不展示密钥等原始值。

数值范围及回退值只定义在 `core/storage/constraints.js`；已有 API 默认值继续引用 `config/api.js` 常量。批处理、请求池、缓存读写和相关设置控件引用同一约束。字幕样式等合法自定义字段保留，不因规范化被覆盖。

Provider 能力只定义在 `providers/capabilities.js`，Provider 实现、旧的 `API_SPE_TYPES` 能力集合和校验层均由它派生，不再维护多份能力清单。当前设置 Schema 版本直接引用提示词/迁移版本主线，不再维护独立数字。

## 批处理主线

服务入口使用统一结果身份签名选择队列。队列合批前再次比较配置、必要上下文、语言和调用选项，并要求取消信号属于同一会话。模型、Endpoint、凭据或上下文不同的请求不能共用首个任务的参数。兼容性信息只保留在内存，不写入缓存 URL。

存储命名空间由 `config/storage.js` 的独立版本常量维护，与应用发布版本解耦；设置结构由 Schema 迁移管理。

## 发布主线

| 内容 | 唯一维护来源 | 派生内容 |
| --- | --- | --- |
| 应用版本 | `package.json` | manifest、环境变量、中英文 README 生成区块 |
| Node 主版本 | `.nvmrc` | CI 的 `node-version-file`、README 生成区块 |
| pnpm 版本 | `.pnpm-version` | CI 安装版本、README 生成区块 |

修改主来源后运行 `pnpm sync-version`。`pnpm check:standard` 只检查，不改文件；发现派生内容漂移会失败。CI 在构建前运行它，避免自动修正掩盖仓库遗漏。构建直接从版本主来源注入应用版本。

`pnpm build+zip` 依次构建、压缩、运行 `pnpm verify:release`。校验器检查构建 manifest 版本、MV3、入口、图标、语言资源、manifest 本地化键、网页可访问资源和 HTML 本地资源引用；读取实际 ZIP，并逐文件与构建目录比较。ZIP 内路径、重复文件和压缩格式也经过检查。

校验成功生成 `build/chrome.zip.sha256` 与 `build/release-report.json`。报告包含 Git revision、工作区是否有改动、配置/实际 Node 版本、文件列表及各文件 SHA-256。CI 上传 ZIP、摘要和报告，保留 30 天，产物名称包含提交 SHA。上传 CI 产物不等同于发布 GitHub Release。

本地如使用不同 Node 版本，报告会记录实际版本；正式 CI 按 `.nvmrc` 执行。包内容检查不能替代浏览器运行验收。
