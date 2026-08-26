'use client';

import { ReportWorkbench } from '@/components/invoicing/ReportWorkbench';
import { formatCurrency } from '@/lib/utils';

export default function RevenueByItemPage() {
  return (
    <ReportWorkbench
      title="Revenue by Item"
      description="Item-wise sales performance from submitted invoice line items."
      endpoint="/invoicing/reports/revenue-by-item"
      keyField="productId"
      filters={{ search: true, customer: true, dateRange: true }}
      kpis={[
        { key: 'itemCount', label: 'Items Sold' },
        { key: 'quantity', label: 'Units' },
        { key: 'revenue', label: 'Revenue', money: true },
        { key: 'taxAmount', label: 'Tax', money: true },
      ]}
      columns={[
        { key: 'sku', header: 'SKU', render: (row: any) => row.sku || '-' },
        { key: 'name', header: 'Item', render: (row: any) => row.name || '-' },
        { key: 'quantity', header: 'Qty', render: (row: any) => Number(row.quantity || 0).toLocaleString() },
        { key: 'averageRate', header: 'Avg Rate', render: (row: any) => formatCurrency(Number(row.averageRate || 0)) },
        { key: 'netAmount', header: 'Net Sales', render: (row: any) => formatCurrency(Number(row.netAmount || 0)) },
        { key: 'taxAmount', header: 'Tax', render: (row: any) => formatCurrency(Number(row.taxAmount || 0)) },
        { key: 'revenue', header: 'Revenue', render: (row: any) => <span className="font-semibold">{formatCurrency(Number(row.revenue || 0))}</span> },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'customerCount', header: 'Customers' },
      ]}
    />
  );
}
