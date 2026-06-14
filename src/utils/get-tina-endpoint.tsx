// We can't use the config file because it's not available on the server side as it's client-side only
// import { config } from "../../tina/config";

export const getTinaEndpoint = (): string | null => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Self-hosted mode: always use the local API route.
  if (process.env.TINA_PUBLIC_USE_LOCAL_DB === "false") {
    return `${siteUrl}/api/tina/gql`;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4001/graphql";
  }

  const clientId = process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
  const branch =
    process.env.NEXT_PUBLIC_TINA_BRANCH || // custom branch env override
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || // Vercel branch env
    process.env.HEAD; // Netlify branch env

  if (!clientId || !branch) {
    return null;
  }

  return `https://content.tinajs.io/1.5/content/${clientId}/github/${branch}`;
};
