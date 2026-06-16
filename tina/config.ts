import { defineConfig, LocalAuthProvider } from "tinacms";
import { DefaultAuthJSProvider } from "tinacms-authjs/dist/tinacms";
import { schema } from "./schema";
import { SelfHostedSearchClient } from "./search/self-hosted-search-client";

// Auth toggle: when true, runs unauthenticated (local dev mode).
const isLocalAuth =
  (process.env.TINA_PUBLIC_USE_LOCAL_AUTH ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

// The admin SPA runs in the browser at the same origin as the API, so a
// relative path works universally and avoids baking a hostname at build time.
// Only override with an absolute URL when TINA_LOCAL_URL is explicitly set
// (e.g. local pagefind build talks to port 4001 directly).
const contentApiUrl = process.env.TINA_LOCAL_URL || "/api/tina/gql";

export const config = defineConfig({
  contentApiUrlOverride: contentApiUrl,
  authProvider: isLocalAuth
    ? new LocalAuthProvider()
    : new DefaultAuthJSProvider({ name: "Microsoft Entra ID" }),
  schema,
  branch: process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.ADO_BRANCH || "main",
  // clientId / token are unused in self-hosted mode but the type requires them.
  clientId: null,
  token: null,
  // Custom media store backed by Azure Blob Storage. Dynamic import keeps the
  // Azure SDK out of the admin bundle — Tina only loads it when the Media
  // Manager screen actually mounts.
  media: {
    loadCustomStore: async () => {
      const mod = await import("./media/azure-blob-media-store");
      return mod.AzureBlobMediaStore;
    },
  },
  build: {
    publicFolder: "public",
    outputFolder: "admin",
    basePath: process.env.TINA_BASE_PATH || "",
  },
  search: {
    searchClient: new SelfHostedSearchClient() as any,
  },
});

export default config;
