# EDCi TinaDocs — Operations Guide

## Running Locally

1. Copy `.env.example` to `.env.local` and fill in the required values (`MONGODB_URI`, `ADO_*`, etc.)
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the dev server:
   ```bash
   pnpm dev
   ```
   - Site: `http://localhost:3000`
   - CMS admin: `http://localhost:3000/admin`

> The `dev` script runs TinaCMS and Next.js (Turbopack) together. A `predev` check will warn you if the Pagefind index is missing.

## Scripts

| Command                   | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `pnpm sync-content`       | Copies content from `tina-test-content` repo → reindexes into MongoDB |
| `pnpm build:index`        | Reindexes local content into MongoDB (no copy)                        |
| `pnpm build:docker`       | Builds Docker image + pushes to ACR                                   |
| `pwsh scripts/deploy.ps1` | Build + push + update Container App (full deploy)                     |

## Typical Workflows

### Content-only changes (no schema/code changes)

1. Make content changes in `tina-test-content`, commit and push
2. Run `pnpm sync-content` — copies content and reindexes into MongoDB
3. Deployed app picks up changes immediately (no redeploy needed)

### Schema or code changes

1. Make changes in `tina-docs` (e.g. `tina/collections/docs.tsx`)
2. Commit and push
3. Run `pwsh scripts/deploy.ps1` — rebuilds Docker image, pushes to ACR, updates Container App
4. After deploy completes, run `pnpm sync-content` to reindex content with new schema

## Prerequisites

- **Azure CLI** authenticated to tenant `e0132c5c-0124-4a4d-ab51-d4cb66381145`:
  ```
  az login --tenant e0132c5c-0124-4a4d-ab51-d4cb66381145
  ```
- **Docker Desktop** running (for `deploy.ps1` / `build:docker`)
- **`.env.local`** configured with `MONGODB_URI`, `ADO_*` vars (see `.env.example`)
- **`tina-test-content`** repo cloned at `../../edci/Prototypes/tina-test-content` (relative to this repo)

## Infrastructure

- **Container App:** `tina-docs-dev-app`
- **Resource Group:** `tina-selfhosting-dev-rg`
- **ACR:** `tinaselfhostingdevacrd5e844.azurecr.io`
- **Content Source:** ADO repo `tina-test-content`, branch `tinadoc-selfhosting`
- **Database:** Cosmos DB for MongoDB, collection `tinacms-tinadoc-selfhosting`
- **Terraform:** `../tina-selfhosting-infrastructure/iac/`

## Markdown Handling in TinaCMS

TinaCMS uses **Plate** for its rich-text editor (which handles MDX/Markdown in the editing UI) and **Zod** for schema validation. For MDX parsing specifically, it uses **@tinacms/mdx** which relies on **remark** and **rehype** under the hood.

Let me check the fork to confirm the specifics:  

Searched for regex `remark|rehype|plate|zod|mdx.*parse` (`tina-github-tinacms-fork` · `packages/@tinacms/mdx/package.json`), 4 results

Searched for text `plate` (`tina-github-tinacms-fork` · `packages/tinacms/package.json`), 20 results

TinaCMS uses:

- **Plate** (`@udecode/plate` and ~20 Plate plugins) — the rich-text editor framework for visual editing in the CMS admin UI
- **remark** / **remark-mdx** / **remark-gfm** — for parsing MDX/Markdown on the server/build side (in the `@tinacms/mdx` package)

The MDX package converts between remark AST and Plate's internal format (see `parse/plate.ts` in `@tinacms/mdx`). So **Plate** is the editor and **remark** is the Markdown parser/preprocessor.

If you were specifically thinking of the schema validation layer, TinaCMS defines its own schema system in `@tinacms/graphql` that generates a GraphQL schema from your config.ts collections — it doesn't use Zod for that.
