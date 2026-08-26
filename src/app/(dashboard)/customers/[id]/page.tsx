'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CreditCard, FileText, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatsCard } from '@/components/shared/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { Customer, SalesInvoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';

interface OutstandingSummary {
  customerId: string;
  customerName: string;
  currency: string;
  totalInvoiced: number;
  amountPaid: number;
  outstanding: number;
  overdueOutstanding: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
}

function invoiceTotal(invoice: SalesInvoice) {
  return Number(invoice.grandTotal ?? invoice.total ?? 0);
}

function invoiceOutstanding(invoice: SalesInvoice) {
  return Number(invoice.outstandingAmount ?? invoiceTotal(invoice) - Number(invoice.amountPaid || 0));
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [summary, setSummary] = useState<OutstandingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${params.id}`)
      .then(res => setCustomer(res.data?.data))
      .catch(err => showApiError(err, 'Failed to load customer details'))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    Promise.all([
      api.get(`/customers/${params.id}/invoices`),
      api.get(`/customers/${params.id}/outstanding`),
    ])
      .then(([invoiceRes, outstandingRes]) => {
        const invoicePayload = invoiceRes.data?.data;
        setInvoices(invoicePayload?.items || invoicePayload || []);
        setSummary(outstandingRes.data?.data || outstandingRes.data);
      })
      .catch(err => showApiError(err, 'Failed to load customer invoice history and balances'))
      .finally(() => setInvoiceLoading(false));
  }, [params.id]);

  if (isLoading || !customer) {
    return <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/customers"><ArrowLeft className="mr-2 h-4 w-4" />Back to customers</Link>
        </Button>
        <h1 className="text-xl font-semibold text-[#1f2937]">{customer.name}</h1>
        <p className="text-sm text-[#6b7280]">{customer.customerNo} · {customer.email || 'No email'} · {customer.currency}</p>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <Info label="Phone" value={customer.phone || '-'} />
              <Info label="Tax ID" value={customer.taxId || '-'} />
              <Info label="Payment Terms" value={`${customer.paymentTerms} days`} />
              <Info label="Credit Limit" value={formatCurrency(customer.creditLimit, customer.currency)} />
              <Info label="Address" value={[customer.address, customer.city, customer.country].filter(Boolean).join(', ') || '-'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard title="Total Invoiced" value={formatCurrency(summary.totalInvoiced, summary.currency)} icon={FileText} iconColor="text-[#1674c4]" iconBg="bg-[#eef6fd]" />
              <StatsCard title="Amount Paid" value={formatCurrency(summary.amountPaid, summary.currency)} icon={CreditCard} iconColor="text-[#0f9d58]" iconBg="bg-[#eefaf3]" />
              <StatsCard title="Outstanding" value={formatCurrency(summary.outstanding, summary.currency)} icon={IndianRupee} iconColor="text-[#d98324]" iconBg="bg-[#fff7ed]" />
              <StatsCard title="Overdue" value={formatCurrency(summary.overdueOutstanding, summary.currency)} subtitle={`${summary.overdueInvoiceCount} overdue invoices`} icon={Clock} iconColor="text-[#c3423f]" iconBg="bg-[#fff1f0]" />
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                isLoading={invoiceLoading}
                data={invoices}
                columns={[
                  { key: 'invoiceNo', header: 'Invoice #', render: (invoice: SalesInvoice) => <Link href={`/invoicing/sales-invoices/${invoice.id}`} className="font-mono text-sm font-semibold text-[#1674c4] hover:underline">{invoice.invoiceNo}</Link> },
                  { key: 'date', header: 'Date', render: (invoice: SalesInvoice) => formatDate(invoice.date) },
                  { key: 'dueDate', header: 'Due Date', render: (invoice: SalesInvoice) => invoice.dueDate ? formatDate(invoice.dueDate) : '-' },
                  { key: 'status', header: 'Status', render: (invoice: SalesInvoice) => <StatusBadge status={invoice.status} /> },
                  { key: 'total', header: 'Total', render: (invoice: SalesInvoice) => formatCurrency(invoiceTotal(invoice), invoice.currency) },
                  { key: 'amountPaid', header: 'Paid', render: (invoice: SalesInvoice) => formatCurrency(Number(invoice.amountPaid || 0), invoice.currency) },
                  { key: 'outstanding', header: 'Outstanding', render: (invoice: SalesInvoice) => formatCurrency(invoiceOutstanding(invoice), invoice.currency) },
                ]}
                onRowClick={invoice => { window.location.href = `/invoicing/sales-invoices/${invoice.id}`; }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] px-3 py-2">
      <p className="text-xs font-medium uppercase text-[#7c8591]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#1f2937]">{value}</p>
    </div>
  );
}
