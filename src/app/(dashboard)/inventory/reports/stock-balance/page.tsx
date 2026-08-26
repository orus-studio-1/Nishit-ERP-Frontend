'use client';

import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { showApiError } from '@/lib/apiError';

export default function StockBalanceReportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/reports/stock-balance', { params: { lowStock: lowOnly || undefined } });
      setRows(res.data?.data?.rows || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load stock balance report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lowOnly]);

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Balance" description="Warehouse-wise actual, reserved, available, and reorder position" />
      <div className="flex gap-2">
        <Button variant={lowOnly ? 'default' : 'outline'} size="sm" onClick={() => setLowOnly(!lowOnly)}>
          <Boxes className="mr-2 h-4 w-4" />
          Low Stock Only
        </Button>
      </div>
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
            key: 'availableQty',
            header: 'Available',
            render: (row: any) => (
              <span
                className={
                  row.availableQty <= row.reorderLevel
                    ? 'font-semibold text-red-600'
                    : 'font-semibold text-green-700'
                }
              >
                {Number(row.availableQty).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'reorderLevel',
            header: 'Reorder Level',
            render: (row: any) => Number(row.reorderLevel).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}
