import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { $, quote } from "zx";
import { nodeVersion, pnpmVersion, root } from "./release-standard.mjs";

const EXCLUDED_PREFIXES = [
  ".codex-doc-work/",
  ".git/",
  ".pnpm-store/",
  "build/",
  "node_modules/",
  "reports/",
  "tmp/",
];

const REQUIRED_SOURCE_FILES = [
  "LICENSE",
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  "docs/gpl-source-provision_v1.md",
  "src/libs/translator.js",
  "src/libs/dnrRules.js",
  "src/libs/dnrRules.test.js",
  "src/providers/translation.js",
  "src/core/dom/layout.js",
  "src/core/dom/layout.test.js",
  "src/scripts/archive.mjs",
  "src/scripts/build-task.mjs",
  "src/scripts/chrome-smoke.mjs",
  "src/scripts/release-preflight.mjs",
  "src/scripts/verify-release.mjs",
  "docs/release-process_v1.md",
];

if (process.platform === "win32") {
  $.shell = "cmd.exe";
  $.prefix = "";
  $.quote = quote;
}

function isExcluded(file) {
  const normalized = file.replaceAll("\\", "/");
  if (EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return /^\.env(?:\.(?!example$).*)?$/.test(normalized);
}

export async function packageSource({ targetDir }) {
  const sourceDir = path.join(root, "build", "corresponding-source");
  const outputDir = path.resolve(root, targetDir);
  const sourceArchive = path.join(outputDir, "corresponding-source.zip");
  await rm(sourceDir, { recursive: true, force: true });
  await mkdir(sourceDir, { recursive: true });

  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "buffer" }
  )
    .toString("utf8")
    .split("\0")
    .filter((file) => file && !isExcluded(file));

  for (const file of files) {
    const sourcePath = path.resolve(root, file);
    const relativePath = path.relative(root, sourcePath);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(`Source path escapes the repository: ${file}`);
    }

    let info;
    try {
      info = await lstat(sourcePath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (info.isSymbolicLink()) {
      throw new Error(
        `Symbolic links are not allowed in source archive: ${file}`
      );
    }
    if (!info.isFile()) continue;

    const destination = path.join(sourceDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(sourcePath, destination);
  }

  for (const file of REQUIRED_SOURCE_FILES) {
    try {
      await lstat(path.join(sourceDir, file));
    } catch {
      throw new Error(`Required corresponding source is missing: ${file}`);
    }
  }

  const originalCwd = $.cwd;
  try {
    $.cwd = path.join(root, "build");
    await $`pnpm exec bestzip chrome/corresponding-source.zip corresponding-source`;
  } finally {
    $.cwd = originalCwd;
  }

  const sourceHash = createHash("sha256")
    .update(await readFile(sourceArchive))
    .digest("hex");
  const notice = [
    `LingoFlow Chrome package v${JSON.parse(await readFile(path.join(sourceDir, "package.json"), "utf8")).version}`,
    "License: GPL-3.0-only (see LICENSE).",
    "Corresponding Source archive: corresponding-source.zip",
    `Corresponding Source SHA-256: ${sourceHash}`,
    "The archive contains the project source, tests, build scripts, public assets, package manifest, lockfile, and license from the build working tree.",
    "Build instructions: corresponding-source/docs/gpl-source-provision_v1.md",
    "Public repository: https://github.com/Guivyn/lingoflow",
    `Build toolchain: Node.js ${nodeVersion}, pnpm ${pnpmVersion}`,
    "",
  ].join("\n");

  await mkdir(outputDir, { recursive: true });
  await copyFile(path.join(root, "LICENSE"), path.join(outputDir, "LICENSE"));
  await writeFile(path.join(outputDir, "SOURCE-CODE.txt"), notice, "utf8");
}
