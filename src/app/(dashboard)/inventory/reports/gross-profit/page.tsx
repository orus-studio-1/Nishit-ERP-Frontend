'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { showApiError } from '@/lib/apiError';

export default function GrossProfitPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + Number(row.revenue || 0),
          cost: acc.cost + Number(row.cost || 0),
          profit: acc.profit + Number(row.grossProfit || 0),
        }),
        { revenue: 0, cost: 0, profit: 0 }
      ),
    [rows]
  );

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/inventory/reports/gross-profit')
      .then((res) => setRows(res.data?.data || []))
      .catch((err) => showApiError(err, 'Failed to load gross profit report'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Gross Profit" description="Sales revenue minus product cost, grouped by sales order" />
      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <Logic label="Logic" value="Sales Order total - quantity × product cost price" />
          <Logic label="Revenue" value={formatCurrency(totals.revenue)} />
          <Logic label="Cost" value={formatCurrency(totals.cost)} />
          <Logic label="Gross Profit" value={formatCurrency(totals.profit)} />
        </CardContent>
      </Card>
      <DataTable
        data={rows}
        isLoading={isLoading}
        columns={[
          {
            key: 'orderNo',
            header: 'Sales Order',
            render: (row: any) => <span className="font-mono text-xs">{row.orderNo}</span>,
          },
          { key: 'customer', header: 'Customer', render: (row: any) => row.customer || '-' },
          { key: 'revenue', header: 'Revenue', render: (row: any) => formatCurrency(row.revenue) },
          { key: 'cost', header: 'Cost', render: (row: any) => formatCurrency(row.cost) },
          {
            key: 'grossProfit',
            header: 'Gross Profit',
            render: (row: any) => (
              <span className={Number(row.grossProfit) < 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
                {formatCurrency(row.grossProfit)}
              </span>
            ),
          },
          {
            key: 'grossMargin',
            header: 'Margin %',
            render: (row: any) => `${Number(row.grossMargin || 0).toFixed(2)}%`,
          },
        ]}
      />
    </div>
  );
}

function Logic({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1f2937]">{value}</p>
    </div>
  );
}
