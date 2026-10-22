import { syncStandard } from "./release-standard.mjs";
await syncStandard(process.argv.includes("--check"));
