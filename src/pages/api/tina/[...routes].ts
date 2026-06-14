import { LocalBackendAuthProvider, TinaNodeBackend } from "@tinacms/datalayer";
import type { IncomingMessage, ServerResponse } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import { AuthJsBackendAuthProvider } from "tinacms-authjs";
import databaseClient from "../../../../tina/__generated__/databaseClient";
import { buildAuthOptions } from "../../../../tina/auth";

const isLocalAuth =
  (process.env.TINA_PUBLIC_USE_LOCAL_AUTH ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

// Wrap the auth provider to allow unauthenticated read (query) requests.
// The docs content is public; only mutations (edits) require a valid session.
const authJsProvider = AuthJsBackendAuthProvider({
  authOptions: buildAuthOptions(),
});

const readAllowingAuthProvider = {
  ...authJsProvider,
  isAuthorized: async (req: IncomingMessage, res: ServerResponse) => {
    // Read the request body to check if it's a mutation.
    // Next.js has already parsed it onto (req as NextApiRequest).body.
    const body = (req as unknown as NextApiRequest).body;
    const isMutation =
      typeof body?.query === "string" && body.query.trimStart().startsWith("mutation");

    if (!isMutation) {
      // Allow reads without auth — content is public.
      return { isAuthorized: true as const };
    }

    // Mutations require auth. First try the standard session cookie check.
    const cookieResult = await authJsProvider.isAuthorized(req, res);
    if (cookieResult.isAuthorized) {
      return cookieResult;
    }

    // Fall back: trust internal server-to-server calls that present the
    // NEXTAUTH_SECRET (e.g. process-api-docs generating MDX files).
    const internalToken = (req as unknown as NextApiRequest).headers["x-internal-token"];
    if (process.env.NEXTAUTH_SECRET && internalToken === process.env.NEXTAUTH_SECRET) {
      return { isAuthorized: true as const };
    }

    return cookieResult;
  },
};

const handler = TinaNodeBackend({
  authProvider: isLocalAuth ? LocalBackendAuthProvider() : readAllowingAuthProvider,
  databaseClient,
});

export default function tinaHandler(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}
