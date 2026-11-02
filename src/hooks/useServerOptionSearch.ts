'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';

const optionId = (item: unknown) => (item as { id?: string }).id;

interface ServerOptionSearchOptions<T> {
  params?: Record<string, unknown>;
  /** Keeps only rows valid for this dropdown, matching the filter applied to its initial list. */
  accept?: (item: T) => boolean;
}

/** Dropdowns load only the first page of a master list, so a record outside it can't be picked.
 * This returns a search function that looks up the rest on the server and merges the matches into
 * the page's existing list, so lookups like `products.find(...)` keep working once one is picked. */
export function useServerOptionSearch<T>(
  url: string,
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  options: ServerOptionSearchOptions<T> = {},
) {
  return async (query: string) => {
    const res = await api.get(url, { params: { ...options.params, search: query, limit: 50 } });
    const found: T[] = res.data?.data?.items || res.data?.data || [];
    const accepted = options.accept ? found.filter(options.accept) : found;
    setItems((current) => {
      const known = new Set(current.map(optionId));
      return [...current, ...accepted.filter((item) => !known.has(optionId(item)))];
    });
  };
}

/** Debounces a dropdown's server search and reports whether one is still in flight. */
export function useDebouncedServerSearch(onServerSearch?: (query: string) => Promise<void>) {
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRequest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (rawQuery: string) => {
    if (!onServerSearch) return;
    clearTimeout(timer.current);
    const request = ++latestRequest.current;
    const query = rawQuery.trim();
    setSearching(Boolean(query));
    if (!query) return;
    timer.current = setTimeout(async () => {
      try {
        await onServerSearch(query);
      } catch (err) {
        showApiError(err, 'Search failed');
      } finally {
        if (request === latestRequest.current) setSearching(false);
      }
    }, 300);
  };

  return { searching, search };
}
