#!/usr/bin/env zx
import { $, argv } from "zx";

/**
 * 版本号更新脚本
 * 使用 npm version 命令更新 package.json 中的版本号，然后自动同步到其他文件
 * 
 * 用法:
 *   pnpm version:patch  // 2.0.19 -> 2.0.20
 *   pnpm version:minor  // 2.0.19 -> 2.1.0
 *   pnpm version:major  // 2.0.19 -> 3.0.0
 *   pnpm version:set -- 2.1.0  // 手动指定版本号
 */

const rootDir = path.resolve(__dirname, "../..");
const versionType = argv._[0] || argv.type || "patch";

console.log(chalk.blue(`\n🚀 开始更新版本号...\n`));

try {
    // 读取当前版本
    const pkgPath = path.join(rootDir, "package.json");
    const pkg = await fs.readJSON(pkgPath);
    const oldVersion = pkg.version;

    console.log(chalk.gray(`当前版本: ${oldVersion}`));

    // 使用 npm version 更新 package.json
    // --no-git-tag-version 参数防止自动创建 git tag
    if (versionType === "set") {
        const newVersion = argv._[1];
        if (!newVersion) {
            console.error(chalk.red("❌ 错误: 请指定版本号，例如: pnpm version:set -- 2.1.0"));
            process.exit(1);
        }
        await $`npm version ${newVersion} --no-git-tag-version`;
    } else {
        await $`npm version ${versionType} --no-git-tag-version`;
    }

    // 重新读取更新后的版本
    const updatedPkg = await fs.readJSON(pkgPath);
    const newVersion = updatedPkg.version;

    console.log(chalk.green(`✅ package.json 版本已更新: ${oldVersion} -> ${newVersion}\n`));

    // 同步到其他文件
    console.log(chalk.blue(`📦 开始同步版本号到其他文件...\n`));
    await $`zx src/scripts/sync-version.mjs`;

    console.log(chalk.green.bold(`\n✨ 版本更新完成！新版本: ${newVersion}\n`));
    console.log(chalk.gray(`提示: 版本号已更新，别忘了提交更改\n`));

} catch (err) {
    console.error(chalk.red("\n❌ 版本更新失败:"));
    console.error(err.message);
    process.exit(1);
}
