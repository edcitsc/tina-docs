/**
 * Search API route for the TinaCMS admin panel.
 *
 * Supports two endpoint patterns to match TinaCMS expectations:
 *   GET /api/tina/search?query=...&collection=...&limit=...&cursor=...  (fuzzy v2)
 *   GET /api/tina/search?q={...}  (legacy v1 JSON query)
 *
 * Also supports POST for index invalidation (called after content saves).
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  getSearchIndexStats,
  invalidateSearchIndex,
  querySearchIndex,
} from "@/lib/search-index";

function getSiteUrl(request: NextRequest): string {
  // Use the request origin as the site URL for internal GQL calls
  const url = new URL(request.url);
  return process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = getSiteUrl(request);

  // v2 fuzzy search path
  const query = searchParams.get("query");
  if (query) {
    const collection = searchParams.get("collection") || undefined;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const cursor = searchParams.get("cursor") || undefined;

    const result = await querySearchIndex(siteUrl, query, {
      collection,
      limit,
      cursor,
    });

    return NextResponse.json(result);
  }

  // v1 legacy query path
  const q = searchParams.get("q");
  if (q) {
    try {
      const parsed = JSON.parse(q);
      // Extract search terms from the v1 query format: { AND: ["term1", "term2"] }
      const terms: string[] = [];
      if (parsed.AND) {
        for (const item of parsed.AND) {
          if (typeof item === "string") terms.push(item);
          else if (item?.OR) terms.push(...item.OR);
        }
      } else if (parsed.OR) {
        terms.push(...parsed.OR);
      }

      const searchText = terms.join(" ");
      const result = await querySearchIndex(siteUrl, searchText);

      // v1 response format
      return NextResponse.json({
        RESULT: result.results.map((r) => ({
          _id: r._id,
          _match: { title: [r.title] },
          title: r.title,
          collection: r.collection,
          path: r.path,
        })),
        RESULT_LENGTH: result.total,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid query format" },
        { status: 400 }
      );
    }
  }

  // No query provided — return index stats
  return NextResponse.json(getSearchIndexStats());
}

export async function POST(request: NextRequest) {
  // POST to invalidate the index (called after content changes)
  const body = await request.json().catch(() => null);

  if (body?.action === "invalidate") {
    invalidateSearchIndex();
    return NextResponse.json({ status: "invalidated" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
