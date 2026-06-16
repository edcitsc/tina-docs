# EDCi TinaDocs — Operations Guide

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
