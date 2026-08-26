'use client';

import { ReportWorkbench } from '@/components/invoicing/ReportWorkbench';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function RevenueByCustomerPage() {
  return (
    <ReportWorkbench
      title="Revenue by Customer"
      description="Submitted invoice revenue, collections, and unpaid exposure by customer."
      endpoint="/invoicing/reports/revenue-by-customer"
      keyField="customerId"
      filters={{ customer: true, dateRange: true }}
      kpis={[
        { key: 'customerCount', label: 'Customers' },
        { key: 'invoiceCount', label: 'Invoices' },
        { key: 'revenue', label: 'Revenue', money: true },
        { key: 'outstandingAmount', label: 'Outstanding', money: true },
      ]}
      columns={[
        { key: 'customerName', header: 'Customer' },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'averageInvoiceValue', header: 'Avg Invoice', render: (row: any) => formatCurrency(Number(row.averageInvoiceValue || 0)) },
        { key: 'subtotal', header: 'Subtotal', render: (row: any) => formatCurrency(Number(row.subtotal || 0)) },
        { key: 'taxAmount', header: 'Tax', render: (row: any) => formatCurrency(Number(row.taxAmount || 0)) },
        { key: 'revenue', header: 'Revenue', render: (row: any) => <span className="font-semibold">{formatCurrency(Number(row.revenue || 0))}</span> },
        { key: 'amountPaid', header: 'Collected', render: (row: any) => formatCurrency(Number(row.amountPaid || 0)) },
        { key: 'outstandingAmount', header: 'Outstanding', render: (row: any) => formatCurrency(Number(row.outstandingAmount || 0)) },
        { key: 'lastInvoiceDate', header: 'Last Invoice', render: (row: any) => row.lastInvoiceDate ? formatDate(row.lastInvoiceDate) : '-' },
      ]}
    />
  );
}
