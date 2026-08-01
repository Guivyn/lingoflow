#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dynamic-i18n-report.json");

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
})(SRC);

const templateCallRe = /(?:i18n|getI18n)\(\s*`([^`]*)\$\{([^}]+)\}/g;
const mapCallRe =
  /([A-Za-z_$][\w$]*|\[[^\]]*\])\s*\.map\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\)?\s*=>/g;
const arrayConstRe =
  /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]*)\]/g;

function resolveIdentifier(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);

  const valueRe = new RegExp(
    `(?:export\\s+)?const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\];|['"][^'"]+['"]|\\d+)`,
    "g"
  );
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    valueRe.lastIndex = 0;
    const match = valueRe.exec(text);
    if (!match) continue;
    const raw = match[1].trim().replace(/;$/, "");
    if (raw.startsWith("[")) {
      return readArrayValues(raw, seen);
    }
    const literal = raw.match(/^['"]([^'"]+)['"]$/);
    if (literal) return [literal[1]];
    const number = raw.match(/^\d+$/);
    if (number) return [number[0]];
    return resolveIdentifier(raw, seen);
  }
  return [];
}

function readArrayValues(source, seen = new Set()) {
  const trimmed = source.trim();
  if (trimmed.startsWith("[")) {
    const values = [];
    const body = trimmed.slice(1, trimmed.lastIndexOf("]"));
    for (const element of body.split(",")) {
      const item = element.trim();
      if (!item) continue;
      const literal = item.match(/^['"]([^'"]+)['"]$/);
      if (literal) {
        values.push(literal[1]);
        continue;
      }
      const number = item.match(/^\d+$/);
      if (number) {
        values.push(number[0]);
        continue;
      }
      values.push(...resolveIdentifier(item, seen));
    }
    return values;
  }

  const name = trimmed;
  const values = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    arrayConstRe.lastIndex = 0;
    let match;
    while ((match = arrayConstRe.exec(text)) !== null) {
      if (match[1] !== name) continue;
      values.push(...readArrayValues(`[${match[2]}]`, seen));
    }
  }
  return values;
}

function resolvePossibleKeys(filePath, sourceText, matchIndex, prefix, expr) {
  const before = sourceText.slice(0, matchIndex);
  let mapMatch = null;
  mapCallRe.lastIndex = 0;
  let current;
  while ((current = mapCallRe.exec(before)) !== null) {
    if (current[2] === expr) {
      mapMatch = current;
    }
  }

  if (!mapMatch) return [];

  const values = readArrayValues(mapMatch[1]);
  return values.map((value) => `${prefix}${value}`);
}

const report = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  templateCallRe.lastIndex = 0;
  let match;
  while ((match = templateCallRe.exec(text)) !== null) {
    const prefix = match[1];
    const expr = match[2].trim();
    const line = text.slice(0, match.index).split("\n").length;
    const pattern = `${prefix}\${${expr}}`;
    report.push({
      file: path.relative(ROOT, file).replace(/\\/g, "/"),
      line,
      pattern,
      expression: expr,
      possibleKeys: resolvePossibleKeys(file, text, match.index, prefix, expr),
    });
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`dynamic i18n report: ${report.length} template calls`);
for (const item of report) {
  console.log(`${item.file}:${item.line} ${item.pattern}`);
  for (const key of item.possibleKeys) {
    console.log(`  -> ${key}`);
  }
}
