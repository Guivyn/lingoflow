import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const read = (name) => readFile(path.join(root, name), "utf8");
export const pkg = JSON.parse(await read("package.json"));
export const nodeVersion = (await read(".nvmrc")).trim();
export const pnpmVersion = (await read(".pnpm-version")).trim();
export const standardBlock = `<!-- release-standard:start -->\n**v${pkg.version}** · Node.js **${nodeVersion}** · pnpm **${pnpmVersion}**\n<!-- release-standard:end -->`;

export async function syncStandard(check = false) {
  const updates = [];
  const manifest = JSON.parse(await read("public/manifest.json"));
  if (manifest.version !== pkg.version)
    updates.push([
      "public/manifest.json",
      JSON.stringify({ ...manifest, version: pkg.version }, null, 2) + "\n",
    ]);
  for (const name of [".env.example", ".env"]) {
    let content;
    try {
      content = await read(name);
    } catch (error) {
      if (name === ".env" && error.code === "ENOENT") continue;
      throw error;
    }
    const updated = /^REACT_APP_VERSION=.*$/m.test(content)
      ? content.replace(
          /^REACT_APP_VERSION=.*$/m,
          `REACT_APP_VERSION=${pkg.version}`
        )
      : content.trimEnd() + `\nREACT_APP_VERSION=${pkg.version}\n`;
    if (updated !== content) updates.push([name, updated]);
  }
  for (const name of ["README.md", "README.en.md"]) {
    const content = await read(name);
    if (!content.includes("<!-- release-standard:start -->"))
      throw new Error(`Missing generated standard block: ${name}`);
    const updated = content.replace(
      /<!-- release-standard:start -->[\s\S]*?<!-- release-standard:end -->/,
      standardBlock
    );
    if (updated !== content) updates.push([name, updated]);
  }
  if (check && updates.length)
    throw new Error(
      `Release standard drift: ${updates.map(([name]) => name).join(", ")}. Run pnpm sync-version.`
    );
  if (!check)
    for (const [name, content] of updates)
      await writeFile(path.join(root, name), content);
  console.log(
    `Release standard ${check ? "checked" : "synced"}: v${pkg.version}, Node ${nodeVersion}, pnpm ${pnpmVersion}`
  );
}
