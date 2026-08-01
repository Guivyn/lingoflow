#!/usr/bin/env zx
import { argv, quote, $ } from "zx";

// 在 Windows 上使用 cmd.exe，避免 zx 默认使用 WSL bash 导致 node not found
if (process.platform === "win32") {
  $.shell = "cmd.exe";
  $.prefix = "";
  $.quote = quote;
}

// 用法: zx src/scripts/build-task.mjs --target=chrome
const target = argv.target;

if (target !== "chrome") {
  console.error(
    chalk.red(
      "Error: this project only builds a Chrome extension. Use --target=chrome"
    )
  );
  process.exit(1);
}

const buildRoot = "build";
const targetDir = path.join(buildRoot, "chrome");

// 辅助：获取构建目录下的文件路径
const inDest = (file) => path.join(targetDir, file);

console.log(chalk.blue(`\nStarting Chrome build...`));

try {
  // 1. 清空当前目标的构建目录
  await fs.remove(targetDir);

  // 2. 标准 React 构建流程
  process.env.BUILD_PATH = `./${targetDir}`;
  process.env.REACT_APP_CLIENT = "chrome";
  process.env.FORCE_COLOR = "1";
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    "--disable-warning=DEP0176",
  ]
    .filter(Boolean)
    .join(" ");

  console.log(chalk.gray(`Running react-app-rewired build...`));
  await $`react-app-rewired build`;

  // 3. 后处理：扩展包不需要独立 content 页面
  await fs.remove(inDest("content.html"));

  console.log(
    chalk.green("Chrome build completed successfully!")
  );
} catch (err) {
  console.error(chalk.red(`\n❌ Build failed for ${target}:`));
  console.error(err);
  process.exit(1);
}
