'use client';

import Link from 'next/link';
import { CreditCard, FilePlus2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Sales Case aggregate documents are intentionally polymorphic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const amount = (value: unknown) => Number(value || 0);

export function SalesCaseInvoiceSummary({ orders, currency }: { orders: Row[]; currency: string }) {
  const invoices = orders.flatMap(order => (order.invoices || []).map((invoice: Row) => ({ ...invoice, orderNo: order.orderNo })));
  return <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Invoices and payment position</CardTitle><CardDescription>Billing, collection and outstanding balances linked to this sales case.</CardDescription></div><div className="flex flex-wrap gap-2">{orders.filter(order => !['DRAFT','CANCELLED'].includes(order.status)).map(order => <Button key={order.id} asChild size="sm" variant="outline"><Link href={`/invoicing/sales-invoices/new?salesOrderId=${order.id}`}><FilePlus2 className="mr-2 h-4 w-4" />Invoice {order.orderNo}</Link></Button>)}<Button asChild size="sm"><Link href="/invoicing/payment-entries"><CreditCard className="mr-2 h-4 w-4" />Record payment</Link></Button></div></div></CardHeader><CardContent className="space-y-3">{invoices.map(invoice => { const total = amount(invoice.grandTotal ?? invoice.total), outstanding = amount(invoice.outstandingAmount), paid = amount(invoice.paidAmount ?? total - outstanding); return <div key={invoice.id} className="rounded-lg border p-4"><div className="flex flex-wrap justify-between gap-3"><div><Link href={`/invoicing/sales-invoices/${invoice.id}`} className="font-mono font-semibold text-blue-600 hover:underline">{invoice.invoiceNo}</Link><p className="text-xs text-muted-foreground">{invoice.orderNo} · Due {invoice.dueDate ? formatDate(invoice.dueDate) : 'not set'}</p></div><StatusBadge status={invoice.paymentStatus || invoice.status} /></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Total <strong className="block">{formatCurrency(total, invoice.currency || currency)}</strong></p><p>Paid <strong className="block text-green-700">{formatCurrency(paid, invoice.currency || currency)}</strong></p><p>Outstanding <strong className="block text-red-700">{formatCurrency(outstanding, invoice.currency || currency)}</strong></p></div></div>; })}{!invoices.length && <p className="text-sm text-muted-foreground">No invoice has been created for this case.</p>}</CardContent></Card>;
}
