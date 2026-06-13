import { LocalBackendAuthProvider, TinaNodeBackend } from "@tinacms/datalayer";
import type { NextApiRequest, NextApiResponse } from "next";
import { AuthJsBackendAuthProvider } from "tinacms-authjs";
import databaseClient from "../../../../tina/__generated__/databaseClient";
import { buildAuthOptions } from "../../../../tina/auth";

const isLocalAuth =
  (process.env.TINA_PUBLIC_USE_LOCAL_AUTH ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

const handler = TinaNodeBackend({
  authProvider: isLocalAuth
    ? LocalBackendAuthProvider()
    : AuthJsBackendAuthProvider({ authOptions: buildAuthOptions() }),
  databaseClient,
});

export default function tinaHandler(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}
