import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';

export type Actor = { id: string; firstName?: string; lastName?: string; email: string; role?: string; employee?: { employeeId?: string } };

export function useAuditTrail<TItem>(endpoint: string, filters: Record<string, string>, errorMessage: string) {
  const [items, setItems] = useState<TItem[]>([]);
  const [users, setUsers] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) };
      const response = await api.get(endpoint, { params });
      const data = response.data?.data || {};
      setItems(data.items || []);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setRaw(data);
    } catch (error) {
      showApiError(error, errorMessage);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, page, errorMessage]);

  useEffect(() => { load(); }, [load]);

  return { items, users, loading, page, setPage, total, totalPages, raw, load, limit };
}
