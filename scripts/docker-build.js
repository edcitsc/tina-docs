// Builds and pushes the Docker image to ACR with correct build args.
// Usage: pnpm run build:docker
//
// Reads NEXT_PUBLIC_SITE_URL from .env.local (or .env) and the git short hash
// for tagging. Authenticates to ACR, builds, pushes, and optionally deploys.
//
// Environment overrides:
//   SITE_URL        - override the deployed URL (instead of reading from env file)
//   ACR_NAME        - override the ACR registry name
//   SKIP_PUSH       - set to "true" to build without pushing
//   DEPLOY          - set to "true" to also update the Container App

const { execSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const ACR_NAME = process.env.ACR_NAME || "tinaselfhostingdevacrd5e844";
const ACR_REPO = `${ACR_NAME}.azurecr.io/tina-docs`;
const CONTAINER_APP = "tina-docs-dev-app";
const RESOURCE_GROUP = "tina-selfhosting-dev-rg";

// --- Resolve NEXT_PUBLIC_SITE_URL ---
function loadEnvValue(key) {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(__dirname, "..", file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (k === key && v) return v;
    }
  }
  return null;
}

const siteUrl = process.env.SITE_URL || loadEnvValue("NEXT_PUBLIC_SITE_URL") || null;

if (!siteUrl || siteUrl === "http://localhost:3000") {
  console.error(
    "ERROR: NEXT_PUBLIC_SITE_URL is not set to a deployed URL.\n" +
      "       Set it in .env.local or pass SITE_URL=https://... as an env variable.\n" +
      "       Without it, SSR will fail with 404s and admin will get CORS errors.",
  );
  process.exit(1);
}

// --- Get git tag ---
const tag = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();

console.log(`\n  Image tag:  ${tag}`);
console.log(`  Site URL:   ${siteUrl}`);
console.log(`  Registry:   ${ACR_REPO}\n`);

// --- ACR login ---
console.log("Authenticating to ACR...");
execSync(`az acr login --name ${ACR_NAME}`, { stdio: "inherit" });

// --- Docker build ---
console.log(`\nBuilding ${ACR_REPO}:${tag}...`);
execSync(
  `docker build` +
    ` --build-arg NEXT_PUBLIC_SITE_URL=${siteUrl}` +
    ` -t ${ACR_REPO}:${tag}` +
    ` -t ${ACR_REPO}:latest` +
    ` .`,
  { stdio: "inherit" },
);

// --- Push ---
if (process.env.SKIP_PUSH === "true") {
  console.log("\nSKIP_PUSH=true — skipping push.");
} else {
  console.log(`\nPushing ${ACR_REPO}:${tag}...`);
  execSync(`docker push ${ACR_REPO}:${tag}`, { stdio: "inherit" });
  execSync(`docker push ${ACR_REPO}:latest`, { stdio: "inherit" });
  console.log(`\nPushed: ${ACR_REPO}:${tag}`);
}

// --- Deploy ---
if (process.env.DEPLOY === "true") {
  console.log(`\nDeploying to ${CONTAINER_APP}...`);
  const revision = execSync(
    `az containerapp update --name ${CONTAINER_APP} --resource-group ${RESOURCE_GROUP}` +
      ` --image ${ACR_REPO}:${tag} --query "properties.latestRevisionName" -o tsv`,
    { encoding: "utf8" },
  ).trim();
  console.log(`Deployed revision: ${revision}`);
} else {
  console.log(
    `\nTo deploy, run:\n  DEPLOY=true pnpm run build:docker\n` +
      `Or manually:\n  az containerapp update --name ${CONTAINER_APP}` +
      ` --resource-group ${RESOURCE_GROUP}` +
      ` --image ${ACR_REPO}:${tag}`,
  );
}

console.log("\nDone.");
