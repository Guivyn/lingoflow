#!/usr/bin/env zx
import { quote, $ } from "zx";

// 在 Windows 上使用 cmd.exe，避免 zx 默认使用 WSL bash 导致命令无法执行。
if (process.platform === "win32") {
  $.shell = "cmd.exe";
  $.prefix = "";
  $.quote = quote;
}

console.log(chalk.cyan("\nStarting compression tasks...\n"));

// 1. 进入 build 目录
cd("build");

// 2. 清理旧的 zip 文件，避免依赖额外的 shell 工具
const oldZips = (await fs.readdir(".")).filter((name) => name.endsWith(".zip"));
for (const name of oldZips) {
  await fs.remove(name);
}

/**
 * 定义打包任务配置
 * * @property {string} output - 输出文件名
 * @property {string} source - 要打包的源（文件或目录名）
 * @property {string} [cwd]  - (可选) 执行打包命令时所在的目录。
 */
const tasks = [{ output: "chrome.zip", source: "chrome" }];

try {
  for (const task of tasks) {
    console.log(`Zipping folder ${task.source}...`);
    await $`npx bestzip ${task.output} ${task.source}`;
  }
  console.log(chalk.green("\nZip created successfully."));
} catch (err) {
  console.error(chalk.red("❌ Error during zipping:"), err);
  process.exit(1);
}
