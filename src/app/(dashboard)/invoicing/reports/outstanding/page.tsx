'use client';

import Link from 'next/link';
import { ReportWorkbench } from '@/components/invoicing/ReportWorkbench';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OutstandingReportPage() {
  return (
    <ReportWorkbench
      title="Outstanding Invoices"
      description="Live receivables by invoice, customer, due date, and payment status."
      endpoint="/invoicing/reports/outstanding"
      keyField="id"
      filters={{ search: true, customer: true, dateRange: true, overdue: true }}
      kpis={[
        { key: 'invoiceCount', label: 'Open Invoices' },
        { key: 'outstandingAmount', label: 'Outstanding', money: true },
        { key: 'overdueOutstanding', label: 'Overdue', money: true },
        { key: 'amountPaid', label: 'Collected', money: true },
      ]}
      columns={[
        {
          key: 'invoiceNo',
          header: 'Invoice',
          render: (invoice: any) => (
            <Link className="font-medium text-[#1f6fb2] hover:underline" href={`/invoicing/sales-invoices/${invoice.id}`}>
              {invoice.invoiceNo}
            </Link>
          ),
        },
        { key: 'customer', header: 'Customer', render: (invoice: any) => invoice.customer?.name || '-' },
        { key: 'dueDate', header: 'Due Date', render: (invoice: any) => invoice.dueDate ? formatDate(invoice.dueDate) : '-' },
        { key: 'daysOverdue', header: 'Overdue Days', render: (invoice: any) => invoice.daysOverdue > 0 ? invoice.daysOverdue : 'Current' },
        { key: 'status', header: 'Doc Status', render: (invoice: any) => <StatusBadge status={invoice.status} /> },
        { key: 'paymentStatus', header: 'Payment', render: (invoice: any) => <StatusBadge status={invoice.paymentStatus || 'SENT'} /> },
        { key: 'total', header: 'Total', render: (invoice: any) => formatCurrency(Number(invoice.total || invoice.grandTotal || 0), invoice.currency) },
        { key: 'amountPaid', header: 'Paid', render: (invoice: any) => formatCurrency(Number(invoice.amountPaid || 0), invoice.currency) },
        { key: 'outstandingAmount', header: 'Outstanding', render: (invoice: any) => <span className="font-semibold">{formatCurrency(Number(invoice.outstandingAmount || 0), invoice.currency)}</span> },
      ]}
    />
  );
}
