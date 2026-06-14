/**
 * Server-side search index for the TinaCMS admin panel.
 *
 * Builds an in-memory MiniSearch index from all docs content on first request,
 * then caches it for subsequent queries. The index is rebuilt when content
 * changes (via `invalidate()`) or after a TTL expires.
 */
import MiniSearch, { type SearchResult as MiniSearchResult } from "minisearch";

export interface SearchableDocument {
  id: string;
  title: string;
  body: string;
  collection: string;
  path: string;
}

export interface SearchQueryResult {
  results: Array<{
    _id: string;
    _match: Record<string, string[]>;
    title: string;
    collection: string;
    path: string;
    score: number;
  }>;
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
}

let indexInstance: MiniSearch<SearchableDocument> | null = null;
let documentsLoaded = 0;
let lastBuilt: number | null = null;

/** Time-to-live for the cached index (5 minutes). */
const INDEX_TTL_MS = 5 * 60 * 1000;

function createIndex(): MiniSearch<SearchableDocument> {
  return new MiniSearch<SearchableDocument>({
    fields: ["title", "body"],
    storeFields: ["title", "collection", "path"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
}

/**
 * Extract plain text from a TinaCMS rich-text AST node tree.
 */
function extractTextFromRichText(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (Array.isArray(node)) {
    return node.map(extractTextFromRichText).join(" ");
  }

  if (typeof node === "object" && node !== null) {
    const obj = node as Record<string, unknown>;
    // Text leaf nodes
    if (typeof obj.text === "string") {
      return obj.text;
    }
    // Recurse into children
    if (Array.isArray(obj.children)) {
      return obj.children.map(extractTextFromRichText).join(" ");
    }
  }

  return "";
}

/**
 * Fetch all documents from the TinaCMS GraphQL API and build the index.
 */
async function buildIndex(siteUrl: string): Promise<MiniSearch<SearchableDocument>> {
  const index = createIndex();
  const documents: SearchableDocument[] = [];

  // Query docs collection via the internal GQL endpoint
  const docsQuery = `
    query SearchIndexDocs($after: String) {
      docsConnection(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            _sys {
              filename
              breadcrumbs
              relativePath
            }
            title
            body
          }
        }
      }
    }
  `;

  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const response = await fetch(`${siteUrl}/api/tina/gql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: docsQuery,
        variables: { after },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch docs for search index: ${response.status}`);
    }

    const json = await response.json();
    const connection = json?.data?.docsConnection;

    if (!connection?.edges) break;

    for (const edge of connection.edges) {
      const node = edge?.node;
      if (!node) continue;

      const bodyText = extractTextFromRichText(node.body);
      const breadcrumbs: string[] = node._sys?.breadcrumbs ?? [];
      const path = breadcrumbs.join("/");

      documents.push({
        id: `docs:${node._sys.relativePath}`,
        title: node.title || node._sys.filename,
        body: bodyText,
        collection: "docs",
        path,
      });
    }

    hasNextPage = connection.pageInfo?.hasNextPage ?? false;
    after = connection.pageInfo?.endCursor ?? null;
  }

  index.addAll(documents);
  documentsLoaded = documents.length;
  lastBuilt = Date.now();

  return index;
}

/**
 * Get or build the search index. Returns the cached instance if still fresh.
 */
export async function getSearchIndex(siteUrl: string): Promise<MiniSearch<SearchableDocument>> {
  const isStale = lastBuilt && Date.now() - lastBuilt > INDEX_TTL_MS;

  if (!indexInstance || isStale) {
    indexInstance = await buildIndex(siteUrl);
  }

  return indexInstance;
}

/**
 * Invalidate the cached index (call after content changes).
 */
export function invalidateSearchIndex(): void {
  indexInstance = null;
  lastBuilt = null;
  documentsLoaded = 0;
}

/**
 * Query the search index.
 */
export async function querySearchIndex(
  siteUrl: string,
  query: string,
  options?: { collection?: string; limit?: number; cursor?: string },
): Promise<SearchQueryResult> {
  const index = await getSearchIndex(siteUrl);
  const limit = options?.limit ?? 20;
  const offset = options?.cursor ? Number.parseInt(options.cursor, 10) : 0;

  let results: MiniSearchResult[] = index.search(query);

  // Filter by collection if specified
  if (options?.collection) {
    results = results.filter((r) => {
      const doc = index.getStoredFields(r.id) as unknown as SearchableDocument;
      return doc?.collection === options.collection;
    });
  }

  const total = results.length;
  const paged = results.slice(offset, offset + limit);

  const nextCursor = offset + limit < total ? String(offset + limit) : null;
  const prevCursor = offset > 0 ? String(Math.max(0, offset - limit)) : null;

  return {
    results: paged.map((r) => {
      const stored = index.getStoredFields(r.id) as unknown as SearchableDocument;

      // Build _match map: field → matching terms (for admin UI highlighting)
      const matchMap: Record<string, string[]> = {};
      if (r.terms.length > 0) {
        matchMap.title = r.terms;
        matchMap.body = r.terms;
      }

      return {
        _id: r.id as string,
        _match: matchMap,
        title: (stored?.title as string) || "",
        collection: (stored?.collection as string) || "",
        path: (stored?.path as string) || "",
        score: r.score,
      };
    }),
    total,
    nextCursor,
    prevCursor,
  };
}

/**
 * Returns diagnostic info about the search index state.
 */
export function getSearchIndexStats() {
  return {
    isBuilt: indexInstance !== null,
    documentsLoaded,
    lastBuilt: lastBuilt ? new Date(lastBuilt).toISOString() : null,
  };
}
