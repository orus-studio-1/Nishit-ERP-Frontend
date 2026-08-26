'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { showApiError } from '@/lib/apiError';

export function SimpleInventoryReport({
  title,
  description,
  endpoint,
  columns,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: any[];
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get(endpoint)
      .then((res) => setRows(Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.rows || []))
      .catch((err) => showApiError(err, `Failed to load ${title}`))
      .finally(() => setIsLoading(false));
  }, [endpoint, title]);

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      <DataTable data={rows} columns={columns} isLoading={isLoading} />
    </div>
  );
}
