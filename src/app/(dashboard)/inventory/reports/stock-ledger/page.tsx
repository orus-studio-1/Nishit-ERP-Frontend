'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StockLedgerEntry } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/shared/Pagination';
import { usePaginatedList } from '@/hooks/usePaginatedList';

export default function StockLedgerReportPage() {
  const list = usePaginatedList<StockLedgerEntry>('/inventory/reports/stock-ledger', {}, [], { errorMessage: 'Failed to load stock ledger report' });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Ledger"
        description="Immutable stock movement, quantity after transaction, valuation, and voucher reference"
      />
      <DataTable
        data={list.items}
        isLoading={list.isLoading}
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
      {list.total > list.limit && <Pagination page={list.page} totalPages={list.totalPages} total={list.total} limit={list.limit} onPageChange={list.setPage} />}
    </div>
  );
}
