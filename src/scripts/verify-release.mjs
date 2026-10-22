import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { syncDesignTokens } from "./design-tokens.mjs";
import {
  root,
  pkg,
  nodeVersion,
  pnpmVersion,
  syncStandard,
} from "./release-standard.mjs";

await syncStandard(true);
await syncDesignTokens(true);
const folder = path.join(root, "build/chrome");
const archive = await readFile(path.join(root, "build/chrome.zip"));
const sha = (data) => createHash("sha256").update(data).digest("hex");
const files = new Map();
async function walk(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(
      !entry.isSymbolicLink(),
      "Symlinks are not allowed in release artifacts"
    );
    const name = prefix + entry.name;
    if (entry.isDirectory())
      await walk(path.join(directory, entry.name), name + "/");
    else files.set(name, await readFile(path.join(directory, entry.name)));
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

// Read the ZIP central directory, not just the unpacked build folder.
let end = -1;
for (
  let i = archive.length - 22;
  i >= Math.max(0, archive.length - 65557);
  i--
) {
  if (
    archive.readUInt32LE(i) === 0x06054b50 &&
    i + 22 + archive.readUInt16LE(i + 20) === archive.length
  ) {
    end = i;
    break;
  }
}
assert(end >= 0, "Invalid ZIP end record");
assert.equal(archive.readUInt16LE(end + 4), 0, "Multi-disk ZIP unsupported");
let offset = archive.readUInt32LE(end + 16);
const zipFiles = new Map();
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
for (let i = 0; i < archive.readUInt16LE(end + 10); i++) {
  assert.equal(
    archive.readUInt32LE(offset),
    0x02014b50,
    "Invalid ZIP directory"
  );
  const flags = archive.readUInt16LE(offset + 8);
  const method = archive.readUInt16LE(offset + 10);
  const compressedSize = archive.readUInt32LE(offset + 20);
  const size = archive.readUInt32LE(offset + 24);
  const nameLength = archive.readUInt16LE(offset + 28);
  const name = archive
    .subarray(offset + 46, offset + 46 + nameLength)
    .toString();
  assert(
    !name.startsWith("/") &&
      !name.includes("\\") &&
      !name.split("/").includes(".."),
    `Unsafe ZIP path: ${name}`
  );
  assert(!(flags & 1), "Encrypted ZIP unsupported");
  if (!name.endsWith("/")) {
    const local = archive.readUInt32LE(offset + 42);
    assert.equal(
      archive.readUInt32LE(local),
      0x04034b50,
      "Invalid ZIP local header"
    );
    const start =
      local +
      30 +
      archive.readUInt16LE(local + 26) +
      archive.readUInt16LE(local + 28);
    assert(
      start + compressedSize <= archive.length && size <= 128 * 1024 * 1024,
      "Invalid ZIP entry size"
    );
    const compressed = archive.subarray(start, start + compressedSize);
    assert(method === 0 || method === 8, "Unsupported ZIP compression");
    const content =
      method === 0
        ? compressed
        : inflateRawSync(compressed, { maxOutputLength: 128 * 1024 * 1024 });
    assert.equal(content.length, size);
    assert.equal(
      crc32(content),
      archive.readUInt32LE(offset + 16),
      `ZIP CRC mismatch: ${name}`
    );
    const relative = name.startsWith("chrome/") ? name.slice(7) : name;
    assert(!zipFiles.has(relative), `Duplicate ZIP entry: ${relative}`);
    zipFiles.set(relative, content);
  }
  offset +=
    46 +
    nameLength +
    archive.readUInt16LE(offset + 30) +
    archive.readUInt16LE(offset + 32);
}
assert.equal(zipFiles.size, files.size, "ZIP file count mismatch");
for (const [name, data] of files)
  assert(zipFiles.get(name)?.equals(data), `ZIP content mismatch: ${name}`);
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
