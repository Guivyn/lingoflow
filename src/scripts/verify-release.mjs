import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { syncDesignTokens } from "./design-tokens.mjs";
import {
  root,
  read,
  pkg,
  nodeVersion,
  pnpmVersion,
  syncStandard,
} from "./release-standard.mjs";

await syncStandard(true);
await syncDesignTokens(true);
assert.equal(pkg.license, "GPL-3.0-only", "Package license metadata drift");
const folder = path.join(root, "build/chrome");
const archive = await readFile(path.join(root, "build/chrome.zip"));
const sha = (data) => createHash("sha256").update(data).digest("hex");
const files = new Map();
async function walk(directory, prefix = "", target = files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(
      !entry.isSymbolicLink(),
      "Symlinks are not allowed in release artifacts"
    );
    const name = prefix + entry.name;
    if (entry.isDirectory())
      await walk(path.join(directory, entry.name), name + "/", target);
    else target.set(name, await readFile(path.join(directory, entry.name)));
  }
}
await walk(folder);
const manifest = JSON.parse(files.get("manifest.json").toString());
assert.equal(manifest.version, pkg.version, "Built manifest version drift");
assert.equal(manifest.manifest_version, 3);
const required = (name) => {
  assert(
    typeof name === "string" &&
      !name.startsWith("/") &&
      !name.split("/").includes(".."),
    `Invalid resource path: ${name}`
  );
  assert(
    files.has(name) && files.get(name).length,
    `Missing or empty resource: ${name}`
  );
};
for (const name of [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_ui.page,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action.default_icon || {}),
  ...manifest.content_scripts.flatMap((script) => [
    ...(script.js || []),
    ...(script.css || []),
  ]),
])
  required(name);
for (const entry of manifest.web_accessible_resources || [])
  for (const resource of entry.resources) {
    const pattern = new RegExp(
      "^" +
        resource
          .split("*")
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*") +
        "$"
    );
    assert(
      [...files.keys()].some((name) => pattern.test(name)),
      `Missing web accessible resource: ${resource}`
    );
  }
required(`_locales/${manifest.default_locale}/messages.json`);
for (const entry of await readdir(path.join(root, "public/_locales"), {
  withFileTypes: true,
})) {
  if (entry.isDirectory()) required(`_locales/${entry.name}/messages.json`);
}
for (const [name, content] of files) {
  if (/^_locales\/[^/]+\/messages\.json$/.test(name)) {
    assert(
      Object.keys(JSON.parse(content.toString())).length,
      `Empty locale: ${name}`
    );
  }
  if (name.endsWith(".html")) {
    for (const match of content
      .toString()
      .matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      if (/^(?:[a-z]+:|\/\/|#|%)/i.test(match[1])) continue;
      required(
        path.posix.normalize(
          path.posix.join(
            path.posix.dirname(name),
            match[1].split(/[?#]/)[0].replace(/^\//, "")
          )
        )
      );
    }
  }
}
const messages = JSON.parse(
  files.get(`_locales/${manifest.default_locale}/messages.json`).toString()
);
for (const match of JSON.stringify(manifest).matchAll(/__MSG_(.*?)__/g))
  assert(
    messages[match[1]]?.message,
    `Missing manifest locale key: ${match[1]}`
  );

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

function readZipEntries(archiveBytes, label, stripPrefix = "") {
  let end = -1;
  for (
    let i = archiveBytes.length - 22;
    i >= Math.max(0, archiveBytes.length - 65557);
    i--
  ) {
    if (
      archiveBytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + archiveBytes.readUInt16LE(i + 20) === archiveBytes.length
    ) {
      end = i;
      break;
    }
  }
  assert(end >= 0, `${label}: invalid ZIP end record`);
  assert.equal(
    archiveBytes.readUInt16LE(end + 4),
    0,
    `${label}: multi-disk ZIP unsupported`
  );
  let offset = archiveBytes.readUInt32LE(end + 16);
  const entries = new Map();

  for (let i = 0; i < archiveBytes.readUInt16LE(end + 10); i++) {
    assert.equal(
      archiveBytes.readUInt32LE(offset),
      0x02014b50,
      `${label}: invalid ZIP directory`
    );
    const flags = archiveBytes.readUInt16LE(offset + 8);
    const method = archiveBytes.readUInt16LE(offset + 10);
    const compressedSize = archiveBytes.readUInt32LE(offset + 20);
    const size = archiveBytes.readUInt32LE(offset + 24);
    const nameLength = archiveBytes.readUInt16LE(offset + 28);
    const name = archiveBytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString();
    assert(
      !name.startsWith("/") &&
        !name.includes("\\") &&
        !name.split("/").includes(".."),
      `${label}: unsafe ZIP path ${name}`
    );
    assert(!(flags & 1), `${label}: encrypted ZIP unsupported`);

    if (!name.endsWith("/")) {
      const local = archiveBytes.readUInt32LE(offset + 42);
      assert.equal(
        archiveBytes.readUInt32LE(local),
        0x04034b50,
        `${label}: invalid ZIP local header`
      );
      const start =
        local +
        30 +
        archiveBytes.readUInt16LE(local + 26) +
        archiveBytes.readUInt16LE(local + 28);
      assert(
        start + compressedSize <= archiveBytes.length &&
          size <= 128 * 1024 * 1024,
        `${label}: invalid ZIP entry size`
      );
      const compressed = archiveBytes.subarray(start, start + compressedSize);
      assert(
        method === 0 || method === 8,
        `${label}: unsupported ZIP compression`
      );
      const content =
        method === 0
          ? compressed
          : inflateRawSync(compressed, {
              maxOutputLength: 128 * 1024 * 1024,
            });
      assert.equal(content.length, size, `${label}: entry size mismatch`);
      assert.equal(
        crc32(content),
        archiveBytes.readUInt32LE(offset + 16),
        `${label}: ZIP CRC mismatch ${name}`
      );
      const prefix = stripPrefix ? `${stripPrefix}/` : "";
      const relative = name.startsWith(prefix)
        ? name.slice(prefix.length)
        : name;
      assert(
        !entries.has(relative),
        `${label}: duplicate ZIP entry ${relative}`
      );
      entries.set(relative, content);
    }

    offset +=
      46 +
      nameLength +
      archiveBytes.readUInt16LE(offset + 30) +
      archiveBytes.readUInt16LE(offset + 32);
  }

  return entries;
}

// Read both ZIP central directories, not just the unpacked build folder.
const zipFiles = readZipEntries(archive, "Chrome release ZIP", "chrome");
assert.equal(zipFiles.size, files.size, "ZIP file count mismatch");
for (const [name, data] of files)
  assert(zipFiles.get(name)?.equals(data), `ZIP content mismatch: ${name}`);

const license = Buffer.from(await read("LICENSE"));
assert(
  files.get("LICENSE")?.equals(license),
  "Chrome package must contain the repository GPL license text"
);
const sourceArchive = files.get("corresponding-source.zip");
assert(
  sourceArchive?.length,
  "Chrome package is missing corresponding-source.zip"
);
const sourceFiles = readZipEntries(
  sourceArchive,
  "Corresponding Source ZIP",
  "corresponding-source"
);
const sourceStage = new Map();
await walk(path.join(root, "build/corresponding-source"), "", sourceStage);
assert.equal(
  sourceFiles.size,
  sourceStage.size,
  "Corresponding Source archive file count mismatch"
);
for (const [name, data] of sourceStage) {
  assert(
    sourceFiles.get(name)?.equals(data),
    `Corresponding Source content mismatch: ${name}`
  );
}
for (const name of [
  "LICENSE",
  "package.json",
  "pnpm-lock.yaml",
  "src/libs/translator.js",
  "src/libs/dnrRules.test.js",
  "src/providers/translation.js",
  "src/core/dom/layout.js",
  "src/core/dom/layout.test.js",
  "src/libs/dnrRules.js",
  "src/scripts/build-task.mjs",
  "src/scripts/chrome-smoke.mjs",
  "src/scripts/release-preflight.mjs",
  "src/scripts/verify-release.mjs",
  "docs/gpl-source-provision_v1.md",
  "docs/release-process_v1.md",
]) {
  assert(sourceFiles.has(name), `Corresponding Source is missing ${name}`);
}
assert(
  sourceFiles.get("LICENSE")?.equals(license),
  "Corresponding Source must contain the repository GPL license text"
);
const sourceNotice = files.get("SOURCE-CODE.txt")?.toString("utf8");
assert(sourceNotice, "Chrome package is missing SOURCE-CODE.txt");
assert.match(sourceNotice, /License: GPL-3\.0-only/);
assert.match(
  sourceNotice,
  /Corresponding Source archive: corresponding-source\.zip/
);
const sourceHash = sourceNotice.match(
  /^Corresponding Source SHA-256: ([a-f0-9]{64})$/m
);
assert(sourceHash, "Source notice is missing the corresponding-source SHA-256");
assert.equal(
  sourceHash[1],
  sha(sourceArchive),
  "Corresponding Source hash mismatch"
);
const archiveSha256 = sha(archive);
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const report = {
  version: pkg.version,
  revision: git("rev-parse", "HEAD"),
  dirty: Boolean(git("status", "--porcelain")),
  createdAt: new Date().toISOString(),
  node: { configured: nodeVersion, actual: process.version },
  pnpm: pnpmVersion,
  archive: "chrome.zip",
  sha256: archiveSha256,
  fileCount: files.size,
  files: Object.fromEntries(
    [...files]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => [name, sha(data)])
  ),
};
await writeFile(
  path.join(root, "build/chrome.zip.sha256"),
  `${archiveSha256}  chrome.zip\n`
);
await writeFile(
  path.join(root, "build/release-report.json"),
  JSON.stringify(report, null, 2) + "\n"
);
console.log(
  `Release verified: v${pkg.version}, ${files.size} files, SHA-256 ${archiveSha256}`
);
