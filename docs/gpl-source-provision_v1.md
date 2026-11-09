# GPL-3.0 源码提供与发布检查（v1）

## 发布包内容

Chrome 构建目录包含完整的 `LICENSE`、`SOURCE-CODE.txt` 和 `corresponding-source.zip`。安装包 `chrome.zip` 打包整个构建目录，因此用户取得扩展时也会取得许可证文本和对应源码归档。`SOURCE-CODE.txt` 标出源码归档的 SHA-256，并指向本文件中的重建步骤。

源码归档从构建工作区复制 Git 跟踪文件及非忽略的新文件，排除构建产物、依赖安装目录、本地环境变量文件和工作区报告。归档包含应用源代码、测试、构建脚本、公开资源、`package.json`、pnpm 锁文件和许可证文本。归档不包含 `.env`、`.env.local` 等本机配置。

## 重建扩展

在解压后的源码目录使用仓库固定的 Node.js 与 pnpm 版本：

```sh
pnpm install --frozen-lockfile
pnpm build+zip
```

构建所需的版本位于 `.nvmrc` 与 `.pnpm-version`。外层安装包中的 `corresponding-source.zip` 是构建脚本从同一工作区生成的源码快照；ZIP 校验器会检查其许可证、清单、构建入口、必需源码文件、CRC 和 SHA-256。

## GitHub 发布源

GitHub Release 的源码 ZIP/TAR 是对应 Release tag 的仓库快照。发布 `chrome.zip` 时，构建提交应与该 tag 指向同一提交；源码归档和安装包应在同一 Release 页面或同一交付渠道可取得。仓库和 Release 入口为 <https://github.com/Guivyn/lingoflow/releases>。

自动化检查能确认许可证和项目源码快照随安装包提供，并能检查 ZIP 完整性。它不能代替第三方依赖的许可证兼容性与版权声明审阅，也不能单凭包内文件证明某个已发布二进制由特定 tag 构建。正式发布时应核对 tag、构建提交及 Release 附件，并保留第三方许可声明。
