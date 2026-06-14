/**
 * Self-hosted SearchClient implementation for TinaCMS admin.
 *
 * This client runs in the browser and delegates all queries to the
 * server-side search API route at /api/tina/search.
 *
 * The `put` and `del` methods are no-ops in the browser — the server
 * builds the index by querying the TinaCMS GQL API directly.
 */

export interface SelfHostedSearchOptions {
  /** Base URL of the search API (defaults to relative /api/tina/search). */
  apiUrl?: string;
}

export class SelfHostedSearchClient {
  private apiUrl: string;

  constructor(options?: SelfHostedSearchOptions) {
    this.apiUrl = options?.apiUrl || "/api/tina/search";
  }

  async query(
    query: string,
    options?: {
      collection?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    const params = new URLSearchParams({ query });
    if (options?.collection) params.set("collection", options.collection);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.cursor) params.set("cursor", options.cursor);

    const response = await fetch(`${this.apiUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`);
    }

    return response.json();
  }

  /** No-op in browser — the server builds the index from the database. */
  async put(_docs: unknown[]): Promise<void> {}

  /** No-op in browser — the server manages the index lifecycle. */
  async del(_ids: string[]): Promise<void> {}

  /** Called by the CLI before indexing. No-op for self-hosted. */
  async onStartIndexing(): Promise<void> {}

  /** Called by the CLI after indexing. No-op for self-hosted. */
  async onFinishIndexing(): Promise<void> {}
}
