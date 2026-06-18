// Loads .env.local into process.env then runs `tinacms build` (with indexing).
// Usage: node scripts/build-index.js
const { execSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const envFile = resolve(__dirname, "..", ".env.local");
if (!existsSync(envFile)) {
  console.error("ERROR: .env.local not found. Copy .env.example and fill in values.");
  process.exit(1);
}

const lines = readFileSync(envFile, "utf8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx < 0) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  process.env[key] = value;
}

console.log("Loaded .env.local — indexing to self-hosted data layer...");
console.log(
  `  Branch namespace: ${process.env.ADO_BRANCH || process.env.NEXT_PUBLIC_TINA_BRANCH || "main"}`,
);

// --no-client-build-cache: omit the filesystem response cache from the
// generated client. Keeps tina/__generated__/.cache/ from filling with stale
// SSR responses after every sync, and matches the Dockerfile build flags.
execSync("npx tinacms build --no-client-build-cache", { stdio: "inherit", env: process.env });
