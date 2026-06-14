# Roadmap

## Self-Hosting

### On-demand revalidation
Add a webhook endpoint (e.g. `/api/revalidate`) that ADO calls on push to the content branch. It should call `revalidatePath("/")` so production pages reflect CMS edits without a full redeploy.

### Navigation Bar `beforeSubmit` fires `process-api-docs` on every save
The `beforeSubmit` hook in `tina/collections/navigation-bar.tsx` calls `/api/process-api-docs` with the entire navigation JSON every time any tab is saved. This causes noisy "already exists" errors when API docs MDX files are already present. Fix options:
- Only invoke the route when the API tab data actually changed (diff previous vs new values).
- Switch from `addPendingDocument` to an upsert-style mutation that skips creation if the file exists.
