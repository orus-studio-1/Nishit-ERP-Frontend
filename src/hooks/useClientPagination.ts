'use client';

import { useState } from 'react';

/** Pages through rows the API already returned in full (report endpoints that don't paginate).
 * Goes back to page 1 when the row count changes, e.g. after a filter or search. */
export function useClientPagination<T>(rows: T[] | undefined, limit = 20) {
  const all = rows || [];
  const total = all.length;
  const [requestedPage, setPage] = useState(1);
  const [lastTotal, setLastTotal] = useState(total);

  if (total !== lastTotal) {
    setLastTotal(total);
    setPage(1);
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(requestedPage, totalPages);
  const pageRows = all.slice((page - 1) * limit, page * limit);

  return { pageRows, page, setPage, total, totalPages, limit };
}
