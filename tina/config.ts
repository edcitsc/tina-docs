import { defineConfig, LocalAuthProvider } from "tinacms";
import { DefaultAuthJSProvider } from "tinacms-authjs/dist/tinacms";
import { schema } from "./schema";
import { SelfHostedSearchClient } from "./search/self-hosted-search-client";

// Auth toggle: when true, runs unauthenticated (local dev mode).
const isLocalAuth =
  (process.env.TINA_PUBLIC_USE_LOCAL_AUTH ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

// contentApiUrlOverride is baked into the admin SPA and the generated client.
// It must be an absolute URL for server-side rendering (Node.js fetch needs a
// full origin). For Docker builds, pass --build-arg NEXT_PUBLIC_SITE_URL with
// the deployed URL so the admin SPA also resolves to the correct origin.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const contentApiUrl = process.env.TINA_LOCAL_URL || `${siteUrl}/api/tina/gql`;

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
