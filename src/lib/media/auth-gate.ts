import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { buildAuthOptions } from "../../../tina/auth";

// When TINA_PUBLIC_USE_LOCAL_AUTH is true we short-circuit: the dev server
// is unauthenticated end-to-end, including media writes. This intentionally
// mirrors the LocalBackendAuthProvider behaviour for the GraphQL handler.
const isLocalAuth =
  (process.env.TINA_PUBLIC_USE_LOCAL_AUTH ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

export const isMediaAuthorized = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> => {
  if (isLocalAuth) return true;
  const session = await getServerSession(req, res, buildAuthOptions());
  return Boolean(session?.user);
};
