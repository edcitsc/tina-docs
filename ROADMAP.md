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
