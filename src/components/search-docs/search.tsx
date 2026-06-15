"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchResults } from "./search-results";

const isDev = process.env.NODE_ENV === "development";
// In development, pagefind is available from a local build.
// In production self-hosted mode, pagefind won't exist — fall back to API search.
const pagefindPath = isDev
  ? "/pagefind"
  : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/_next/static/pagefind`;

// Explicit override: set NEXT_PUBLIC_SEARCH_MODE=api to skip pagefind entirely.
const searchMode = process.env.NEXT_PUBLIC_SEARCH_MODE as
  | "api"
  | "pagefind"
  | undefined;

/**
 * Search via the TinaCMS self-hosted search API (/api/tina/search).
 */
async function searchViaApi(
  query: string
): Promise<{ url: string; title: string; excerpt: string }[]> {
  const params = new URLSearchParams({ query, limit: "10" });
  const res = await fetch(`/api/tina/search?${params}`);
  if (!res.ok) throw new Error(`Search API returned ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(
    (r: { path: string; title: string; collection: string }) => ({
      url: `/${r.collection}/${r.path}`.replace(/\/+/g, "/"),
      title: r.title || "Untitled",
      excerpt: "",
    })
  );
}

/**
 * Search via pagefind (static index built at compile time).
 * Returns null if pagefind is unavailable so caller can fall back.
 */
async function searchViaPagefind(
  query: string
): Promise<{ url: string; title: string; excerpt: string }[] | null> {
  if (typeof window === "undefined") return null;
  let pagefindModule: any;
  try {
    pagefindModule = await (window as any).eval(
      `import("${pagefindPath}/pagefind.js")`
    );
  } catch {
    return null; // pagefind not available
  }

  const search = await pagefindModule.search(query);
  const searchResults = await Promise.all(
    search.results.map(async (result: any) => {
      const data = await result.data();

      const searchTerms = query.toLowerCase().match(/\w+/g) || [];
      const textToSearch = `${data.meta.title || ""} ${
        data.excerpt
      }`.toLowerCase();
      const words = textToSearch.match(/\w+/g) || [];
      const matchFound = searchTerms.every((term) =>
        words.some((word: string) => word.includes(term))
      );
      if (!matchFound) return null;

      return {
        url: data.raw_url
          .replace(/^\/server\/app/, "")
          .replace(/\.html$/, "")
          .replace(/\/+/g, "/")
          .trim(),
        title: data.meta.title || "Untitled",
        excerpt: data.excerpt,
      };
    })
  );
  return searchResults.filter(Boolean);
}

export function Search({ className }: { className?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setResults([]);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const performSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let searchResults: { url: string; title: string; excerpt: string }[] | null =
        null;

      // If mode is explicitly "pagefind", only try pagefind.
      // If mode is explicitly "api", only try API.
      // Otherwise, try pagefind first and fall back to API.
      if (searchMode === "api") {
        searchResults = await searchViaApi(value);
      } else if (searchMode === "pagefind") {
        searchResults = await searchViaPagefind(value);
        if (!searchResults) {
          setError(
            "Unable to load search functionality. For more information, please check this README: https://github.com/tinacms/tina-docs?tab=readme-ov-file#search-functionality and refresh the page."
          );
          return;
        }
      } else {
        // Auto-detect: try pagefind, fall back to API
        searchResults = await searchViaPagefind(value);
        if (searchResults === null) {
          searchResults = await searchViaApi(value);
        }
      }

      setResults(searchResults || []);
    } catch {
      setError("An error occurred while searching. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setResults([]);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    // Pagefind is local/instant so no debounce needed.
    // API search uses debounce to avoid excessive server calls.
    if (searchMode === "pagefind") {
      performSearch(value);
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(value), 300);
    }
  };

  return (
    <div
      className="relative w-full md:max-w-lg lg:my-4 lg:mb-4"
      ref={searchContainerRef}
    >
      <div className={`relative md:mr-4 ${className || ""}`}>
        <input
          type="text"
          value={searchTerm}
          className={`w-full text-neutral-text p-1 lg:p-2 lg:pl-6 pl-6 rounded-full bg-neutral-background-secondary shadow-lg border border-neutral-border/50 dark:border-neutral-border-subtle/50 focus:outline-none focus:ring-1 focus:ring-[#0574e4]/50 focus:border-[#0574e4]/50 transition-all ${
            error !== null ? "opacity-50 cursor-not-allowed" : ""
          }`}
          placeholder="Search..."
          onChange={handleSearch}
        />
        <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-primary h-5 w-5" />
      </div>

      {error && (
        <div className="md:mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm w-11/12 mx-auto absolute left-3 z-10">
          {error}
        </div>
      )}

      {!error && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
}
