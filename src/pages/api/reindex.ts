import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import database from "../../../tina/database";

/**
 * POST /api/reindex
 *
 * Triggers TinaCMS content indexing into the remote database (MongoDB).
 * This must be called after first deploy (or whenever the database is empty)
 * to bootstrap the GraphQL schema and content index.
 *
 * Protected by NEXTAUTH_SECRET — pass it as a Bearer token or x-reindex-token header.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple auth: require the NEXTAUTH_SECRET as a bearer token
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "NEXTAUTH_SECRET not configured" });
  }

  const token = req.headers["x-reindex-token"] || req.headers.authorization?.replace("Bearer ", "");

  if (token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Load tina-lock.json which contains schema, lookup, and graphql definitions
    const lockPath = path.join(process.cwd(), "tina", "tina-lock.json");
    if (!fs.existsSync(lockPath)) {
      return res.status(500).json({ error: "tina-lock.json not found" });
    }

    const lockContent = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    const { schema: tinaSchema, graphql: graphQLSchema, lookup } = lockContent;

    if (!tinaSchema || !graphQLSchema) {
      return res.status(500).json({ error: "tina-lock.json is missing schema or graphql" });
    }

    // Trigger indexing
    const result = await (database as any).indexContent({
      graphQLSchema,
      tinaSchema,
      lookup,
    });

    return res.status(200).json({
      success: true,
      message: "Indexing complete",
      warnings: result?.warnings?.length || 0,
    });
  } catch (error: any) {
    console.error("Reindex failed:", error);
    return res.status(500).json({
      error: "Indexing failed",
      message: error.message,
    });
  }
}
