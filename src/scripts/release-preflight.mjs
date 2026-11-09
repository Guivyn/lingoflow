import { execFileSync } from "node:child_process";
import { nodeVersion, pnpmVersion, root } from "./release-standard.mjs";

const mode = process.argv
  .find((argument) => argument.startsWith("--mode="))
  ?.slice("--mode=".length);

if (!["development", "release"].includes(mode)) {
  throw new Error(
    "Choose --mode=development or --mode=release through the documented pnpm command."
  );
}

const expectedNodeMajor = Number(nodeVersion.split(".")[0]);
const actualNodeMajor = Number(process.versions.node.split(".")[0]);
if (actualNodeMajor !== expectedNodeMajor) {
  throw new Error(
    `Node.js ${nodeVersion} is required; this process is ${process.version}.`
  );
}

const userAgent = process.env.npm_config_user_agent || "";
const actualPnpmVersion = userAgent.match(/^pnpm\/([^ ]+)/)?.[1];
if (actualPnpmVersion !== pnpmVersion) {
  throw new Error(
    `pnpm ${pnpmVersion} is required; start this command with pnpm ${pnpmVersion}.`
  );
}

if (mode === "release") {
  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: root, encoding: "utf8" }
  ).trim();
  if (status) {
    console.error("Formal release requires a clean Git worktree.");
    console.error(status);
    process.exitCode = 1;
  }
}

if (process.exitCode !== 1) {
  console.log(
    `${mode} preflight passed: Node ${process.version}, pnpm ${actualPnpmVersion}, Chrome ${process.env.CHROME_PATH || "auto-discovery"}`
  );
}
