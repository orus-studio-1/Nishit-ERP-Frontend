'use client';

import { ReportWorkbench } from '@/components/invoicing/ReportWorkbench';
import { formatCurrency, formatDate } from '@/lib/utils';

function bucket(value: number, className = '') {
  return <span className={`block rounded px-2 py-1 text-right ${className}`}>{formatCurrency(Number(value || 0))}</span>;
}

export default function AgingReportPage() {
  return (
    <ReportWorkbench
      title="Accounts Receivable Aging"
      description="Customer-wise outstanding balances split by overdue risk buckets."
      endpoint="/invoices/aging-report"
      keyField="customerId"
      filters={{ customer: true, asOf: true }}
      kpis={[
        { key: 'invoiceCount', label: 'Open Invoices' },
        { key: 'totalOutstanding', label: 'Outstanding', money: true },
        { key: 'days61To90', label: '61-90 Days', money: true },
        { key: 'days90Plus', label: '90+ Days', money: true },
      ]}
      columns={[
        { key: 'customerName', header: 'Customer' },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'current', header: 'Current', render: (row: any) => bucket(row.current) },
        { key: 'days0To30', header: '0-30', render: (row: any) => bucket(row.days0To30, 'bg-yellow-50') },
        { key: 'days31To60', header: '31-60', render: (row: any) => bucket(row.days31To60, 'bg-orange-50') },
        { key: 'days61To90', header: '61-90', render: (row: any) => bucket(row.days61To90, 'bg-red-50 text-[#9f3a38]') },
        { key: 'days90Plus', header: '90+', render: (row: any) => bucket(row.days90Plus, 'bg-red-100 font-semibold text-[#8f2d2a]') },
        { key: 'totalOutstanding', header: 'Total', render: (row: any) => <span className="font-semibold">{formatCurrency(Number(row.totalOutstanding || 0), row.currency)}</span> },
        { key: 'oldestDueDate', header: 'Oldest Due', render: (row: any) => row.oldestDueDate ? formatDate(row.oldestDueDate) : '-' },
      ]}
    />
  );
}
