// Copies content from the tina-test-content repo and rebuilds the TinaCMS index.
// Usage: pnpm run sync-content
//
// Steps:
//   1. Copies content/ from tina-test-content to this repo's content/
//   2. Runs `tinacms build` (with indexing) against the remote database
//
// Requires .env.local with MONGODB_URI, ADO_* vars configured.

const { execSync } = require("child_process");
const { existsSync } = require("fs");
const { resolve } = require("path");

const CONTENT_REPO = resolve(__dirname, "..", "..", "..", "edci", "Prototypes", "tina-test-content");
const LOCAL_CONTENT = resolve(__dirname, "..", "content");

// --- Step 1: Copy content ---
if (!existsSync(CONTENT_REPO)) {
  console.error(`ERROR: Content repo not found at ${CONTENT_REPO}`);
  console.error("       Expected: tina-test-content repo as a sibling under edci/Prototypes/");
  process.exit(1);
}

const contentSource = resolve(CONTENT_REPO, "content");
if (!existsSync(contentSource)) {
  console.error(`ERROR: No content/ directory in ${CONTENT_REPO}`);
  process.exit(1);
}

console.log(`Copying content from ${contentSource}...`);
if (process.platform === "win32") {
  try {
    execSync(`robocopy "${contentSource}" "${LOCAL_CONTENT}" /MIR /NFL /NDL /NJH /NJS /NC /NS`, {
      stdio: "inherit",
    });
  } catch (err) {
    // robocopy exit codes 0-7 are success, 8+ are errors
    if (err.status >= 8) {
      console.error(`robocopy failed with exit code ${err.status}`);
      process.exit(1);
    }
  }
} else {
  execSync(`rsync -a --delete "${contentSource}/" "${LOCAL_CONTENT}/"`, { stdio: "inherit" });
}
console.log("Content copied.\n");

// --- Step 2: Rebuild index ---
console.log("Rebuilding TinaCMS index...");
execSync("node scripts/build-index.js", { stdio: "inherit" });
