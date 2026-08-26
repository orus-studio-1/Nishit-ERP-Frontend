'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { showApiError } from '@/lib/apiError';

export default function ProjectedStockReportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/inventory/reports/projected-stock')
      .then((res) => setRows(res.data?.data || []))
      .catch((err) => showApiError(err, 'Failed to load projected stock report'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projected Stock"
        description="Actual stock minus open sales order demand by warehouse"
      />
      <DataTable
        data={rows}
        isLoading={isLoading}
        columns={[
          {
            key: 'sku',
            header: 'SKU',
            render: (row: any) => <span className="font-mono text-xs">{row.sku}</span>,
          },
          {
            key: 'productName',
            header: 'Item',
            render: (row: any) => <span className="font-medium text-gray-900">{row.productName}</span>,
          },
          { key: 'warehouse', header: 'Warehouse' },
          {
            key: 'actualQty',
            header: 'Actual',
            render: (row: any) => Number(row.actualQty).toLocaleString(),
          },
          {
            key: 'reservedQty',
            header: 'Reserved',
            render: (row: any) => Number(row.reservedQty).toLocaleString(),
          },
          {
            key: 'openSalesOrderQty',
            header: 'Open SO Qty',
            render: (row: any) => Number(row.openSalesOrderQty).toLocaleString(),
          },
          {
            key: 'projectedQty',
            header: 'Projected',
            render: (row: any) => (
              <span
                className={
                  row.projectedQty < 0
                    ? 'font-semibold text-red-600'
                    : 'font-semibold text-green-700'
                }
              >
                {Number(row.projectedQty).toLocaleString()}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
