import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const target = fileURLToPath(new URL("../public/provider-status.json", import.meta.url));
const result = spawnSync("python3", ["-m", "radar", "providers", "--json"], {
  cwd: repositoryRoot,
  env: process.env,
  encoding: "utf8",
});

if (result.status !== 0) {
  throw new Error(`Could not read provider status: ${(result.stderr || result.stdout).trim()}`);
}

const rows = JSON.parse(result.stdout);
writeFileSync(target, `${JSON.stringify({ providers: rows }, null, 2)}\n`);
console.log(`Synced ${rows.length} direct provider states to public/provider-status.json`);
