# Roadmap

## Self-Hosting

### On-demand revalidation
Add a webhook endpoint (e.g. `/api/revalidate`) that ADO calls on push to the content branch. It should call `revalidatePath("/")` so production pages reflect CMS edits without a full redeploy.

### Navigation Bar `beforeSubmit` fires `process-api-docs` on every save
The `beforeSubmit` hook in `tina/collections/navigation-bar.tsx` calls `/api/process-api-docs` with the entire navigation JSON every time any tab is saved. This causes noisy "already exists" errors when API docs MDX files are already present. Fix options:
- Only invoke the route when the API tab data actually changed (diff previous vs new values).
- Switch from `addPendingDocument` to an upsert-style mutation that skips creation if the file exists.

### Search index cold-start latency
The MiniSearch-based search index (`/api/tina/search`) builds lazily on the first search request after container start. This causes a 2–5 second delay on that first search. Subsequent searches within the 5-minute TTL are instant. Future improvements:
- Pre-warm the index on container startup (e.g. a startup probe that hits `/api/tina/search?query=warmup`).
- Or move to a persistent index (e.g. stored in MongoDB) so rebuild only happens on content change.

### Automate content sync for `tinacms build` indexing
`tinacms build` indexes content from the **local filesystem** (`content/` folder), not from the git provider (ADO). This means developers must manually sync `tina-test-content/content/` → `tina-docs/content/` before re-indexing. Current workaround:
```powershell
Remove-Item -Recurse -Force content
Copy-Item -Recurse "path/to/tina-test-content/content" ./content
pnpm exec tinacms build
```
Future improvements:
- Add a `scripts/sync-content.ps1` that pulls from ADO (or copies from the local clone) automatically before `tinacms build`.
- Or configure `tinacms build` to read from an alternate content path (if supported).
- Long-term: the deployed `/api/reindex` endpoint should fetch content via the git provider API instead of relying on the local filesystem.

### Fix remote `/api/reindex` endpoint
The deployed reindex endpoint currently fails with "No bridge configured" because:
1. The `database.indexContent()` method requires a "bridge" (file-system adapter) that reads content files, but in the standalone Docker image there's no `content/` folder at runtime.
2. TinaCMS's `indexContent` was designed for local-mode indexing where content exists on disk.

To make remote re-indexing work, the endpoint needs to either:
- Include the content in the Docker image (adds size, requires rebuild on content change — defeats the purpose).
- Implement a custom bridge that reads content from the git provider (ADO) API at indexing time.
- Or call the TinaCMS CLI programmatically with a temporary checkout of the content repo.

This is a non-trivial architectural change. For now, re-indexing is done locally via `tinacms build` with the content folder synced from the ADO repo clone.
