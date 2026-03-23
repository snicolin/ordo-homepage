"use client";

import useSWR from "swr";
import { useState, useCallback, useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import Fuse from "fuse.js";
import { fetcher } from "@/lib/fetchers";

const fuseOptions = {
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  keys: [
    { name: "label", weight: 2 },
    { name: "name", weight: 2 },
    { name: "title", weight: 2 },
    { name: "slug", weight: 1.5 },
    { name: "email", weight: 1.5 },
    { name: "description", weight: 1 },
    { name: "content", weight: 0.5 },
    { name: "body", weight: 0.5 },
  ],
};

interface SearchResult {
  id: string;
  label?: string;
  name?: string;
  title?: string;
  slug?: string;
  email?: string;
  description?: string;
  content?: string;
  body?: string;
  image?: string;
  href?: string;
  isHome?: boolean;
  active?: boolean;
  color?: string;
  expiresAt?: string;
  displayType?: string;
  [key: string]: unknown;
}

interface SearchResults {
  pages: SearchResult[];
  sections: SearchResult[];
  items: SearchResult[];
  users: SearchResult[];
  groups: SearchResult[];
  alerts: SearchResult[];
}

const EMPTY: SearchResults = {
  pages: [],
  sections: [],
  items: [],
  users: [],
  groups: [],
  alerts: [],
};

export function useSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setDebouncedQuery(value);
  }, 300);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      const normalized = value.replace(/\s+/g, " ").trim();
      debouncedSetQuery(normalized);
    },
    [debouncedSetQuery],
  );

  const { data, error, isLoading } = useSWR<{ results: SearchResults }>(
    debouncedQuery.length >= 2
      ? `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=30`
      : null,
    fetcher,
  );

  const fuzzyResults = useMemo(() => {
    const sourceResults = data?.results;
    if (!sourceResults || !debouncedQuery) {
      return sourceResults || EMPTY;
    }

    const results: SearchResults = { ...EMPTY };
    const categories = Object.keys(EMPTY) as (keyof SearchResults)[];

    for (const category of categories) {
      const items = sourceResults[category] as SearchResult[];
      if (items && items.length > 0) {
        const fuse = new Fuse(items, fuseOptions);
        const fuzzyMatches = fuse.search(debouncedQuery);
        results[category] = fuzzyMatches
          .sort((a, b) => (a.score || 0) - (b.score || 0))
          .slice(0, 15)
          .map((match) => match.item);
      }
    }

    return results;
  }, [data, debouncedQuery]);

  const totalResults = useMemo(() => {
    return (
      fuzzyResults.pages.length +
      fuzzyResults.sections.length +
      fuzzyResults.items.length +
      fuzzyResults.users.length +
      fuzzyResults.groups.length +
      fuzzyResults.alerts.length
    );
  }, [fuzzyResults]);

  return {
    query,
    setQuery: handleSearch,
    results: fuzzyResults,
    totalResults,
    isLoading,
    isError: error,
  };
}
