import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = "src/ui/theme/tokens.source.json";
const kebab = (value) =>
  value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

export async function syncDesignTokens(check = false) {
  const tokens = JSON.parse(await readFile(path.join(root, source), "utf8"));
  const declarations = [];
  for (const [group, entries] of Object.entries(tokens)) {
    const prefix = ["dark", "translation", "subtitle"].includes(group)
      ? `color-${group}`
      : kebab(group);
    for (const [key, value] of Object.entries(entries)) {
      const unit =
        typeof value === "number"
          ? ["spacing", "radius", "layout"].includes(group)
            ? "px"
            : group === "motion"
              ? "ms"
              : ""
          : "";
      declarations.push(`  --lf-${prefix}-${kebab(key)}: ${value}${unit};`);
    }
  }
  const notice =
    "Generated from tokens.source.json by pnpm sync:design. Do not edit directly.";
  const outputs = {
    "src/ui/theme/tokens.ts": `/** ${notice} */\nexport const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n\nexport type DesignTokens = typeof tokens;\n`,
    "src/ui/theme/variables.css": `/* ${notice} */\n:root {\n${declarations.join("\n")}\n}\n`,
  };
  for (const [name, expected] of Object.entries(outputs)) {
    const actual = await readFile(path.join(root, name), "utf8").catch(
      () => ""
    );
    if (actual.replaceAll("\r\n", "\n") === expected) continue;
    if (check)
      throw new Error(`${name} differs from ${source}. Run pnpm sync:design.`);
    await writeFile(path.join(root, name), expected);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await syncDesignTokens(process.argv.includes("--check"));
  console.log("Design tokens synchronized.");
}
