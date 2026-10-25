import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const radarModule = fileURLToPath(new URL("../../radar/__init__.py", import.meta.url));
const target = fileURLToPath(new URL("../public/provider-status.json", import.meta.url));

if (!existsSync(radarModule)) {
  if (!existsSync(target)) {
    throw new Error("Could not find the checked-in provider status snapshot.");
  }

  const snapshot = JSON.parse(readFileSync(target, "utf8"));
  if (!Array.isArray(snapshot.providers)) {
    throw new Error("The checked-in provider status snapshot is invalid.");
  }

  console.log(`Using ${snapshot.providers.length} checked-in provider states`);
  process.exit(0);
}

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
