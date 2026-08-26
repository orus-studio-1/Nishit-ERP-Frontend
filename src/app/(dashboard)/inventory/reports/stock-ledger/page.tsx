'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StockLedgerEntry } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';

export default function StockLedgerReportPage() {
  const [rows, setRows] = useState<StockLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/inventory/reports/stock-ledger')
      .then((res) => setRows(res.data?.data || []))
      .catch((err) => showApiError(err, 'Failed to load stock ledger report'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Ledger"
        description="Immutable stock movement, quantity after transaction, valuation, and voucher reference"
      />
      <DataTable
        data={rows}
        isLoading={isLoading}
        columns={[
          {
            key: 'postingDate',
            header: 'Posting Date',
            render: (row: StockLedgerEntry) => formatDate(row.postingDate),
          },
          {
            key: 'item',
            header: 'Item',
            render: (row: StockLedgerEntry) => (
              <span className="font-medium text-gray-900">
                {row.product?.sku} - {row.product?.name}
              </span>
            ),
          },
          {
            key: 'warehouse',
            header: 'Warehouse',
            render: (row: StockLedgerEntry) => row.warehouse?.name || row.warehouseId,
          },
          {
            key: 'voucher',
            header: 'Voucher',
            render: (row: StockLedgerEntry) => (
              <span className="font-mono text-xs">
                {row.voucherType} / {row.voucherNo}
              </span>
            ),
          },
          {
            key: 'actualQty',
            header: 'Qty Change',
            render: (row: StockLedgerEntry) => (
              <span
                className={
                  Number(row.actualQty) < 0
                    ? 'text-red-600 font-semibold'
                    : 'text-green-700 font-semibold'
                }
              >
                {Number(row.actualQty).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'qtyAfterTransaction',
            header: 'Balance',
            render: (row: StockLedgerEntry) => Number(row.qtyAfterTransaction).toLocaleString(),
          },
          {
            key: 'valuationRate',
            header: 'Valuation Rate',
            render: (row: StockLedgerEntry) => formatCurrency(row.valuationRate),
          },
          {
            key: 'stockValue',
            header: 'Stock Value',
            render: (row: StockLedgerEntry) => formatCurrency(row.stockValue),
          },
        ]}
      />
    </div>
  );
}
