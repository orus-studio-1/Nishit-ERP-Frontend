'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsePaginatedListOptions {
  limit?: number;
  errorMessage?: string;
  /** Set false to skip fetching (e.g. while a required id isn't known yet). */
  enabled?: boolean;
}

/** Fetches one page of a `{ data: { items, total, ... } }` list endpoint and tracks the
 * loading/error/pagination state around it. Refetches whenever `url`, `page`, `params`
 * (by reference — pass a stable/memoized object) or any of `deps` change; a race-guard
 * discards a stale response if a newer request has since started. Call `reload()` to
 * force a refetch of the current page without changing any params. */
export function usePaginatedList<T>(url: string, params: Record<string, unknown>, deps: unknown[] = [], options: UsePaginatedListOptions = {}) {
  const { limit = 20, errorMessage = 'Failed to load', enabled = true } = options;
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api.get(url, { params: { ...params, page, limit } })
      .then((res) => {
        if (cancelled) return;
        const data: Paged<T> = res.data?.data;
        setItems(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => { if (!cancelled) setError(showApiError(err, errorMessage) || errorMessage); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, enabled, reloadKey, ...deps]);

  const changePage = (p: number) => setPage(p);
  const reload = () => { setPage(1); setReloadKey((k) => k + 1); };

  return { items, total, page, setPage: changePage, isLoading, error, reload, totalPages: Math.ceil(total / limit), limit };
}
