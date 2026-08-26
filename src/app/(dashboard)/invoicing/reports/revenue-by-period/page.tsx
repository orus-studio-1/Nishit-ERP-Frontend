'use client';

import { ReportWorkbench } from '@/components/invoicing/ReportWorkbench';
import { formatCurrency } from '@/lib/utils';

export default function RevenueByPeriodPage() {
  return (
    <ReportWorkbench
      title="Revenue by Period"
      description="Period-wise revenue trend from submitted sales invoices."
      endpoint="/invoicing/reports/revenue-by-period"
      keyField="period"
      filters={{ dateRange: true, groupBy: true }}
      kpis={[
        { key: 'periodCount', label: 'Periods' },
        { key: 'invoiceCount', label: 'Invoices' },
        { key: 'revenue', label: 'Revenue', money: true },
        { key: 'outstandingAmount', label: 'Outstanding', money: true },
      ]}
      columns={[
        { key: 'period', header: 'Period' },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'subtotal', header: 'Subtotal', render: (row: any) => formatCurrency(Number(row.subtotal || 0)) },
        { key: 'taxAmount', header: 'Tax', render: (row: any) => formatCurrency(Number(row.taxAmount || 0)) },
        { key: 'revenue', header: 'Revenue', render: (row: any) => <span className="font-semibold">{formatCurrency(Number(row.revenue || 0))}</span> },
        { key: 'amountPaid', header: 'Collected', render: (row: any) => formatCurrency(Number(row.amountPaid || 0)) },
        { key: 'outstandingAmount', header: 'Outstanding', render: (row: any) => formatCurrency(Number(row.outstandingAmount || 0)) },
      ]}
    />
  );
}
