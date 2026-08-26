'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CreditCard, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import api from '@/lib/api';
import { Payment, SalesInvoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const methods = ['CASH', 'BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'CHEQUE', 'ONLINE'];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'BANK_TRANSFER',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });
  const limit = 20;

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        api.get('/invoicing/payments', { params: { page, limit } }),
        api.get('/invoicing/sales-invoices', { params: { limit: 200 } }),
      ]);
      setPayments(payRes.data?.data?.items || []);
      setTotal(payRes.data?.data?.total || 0);
      const items = invRes.data?.data?.items || invRes.data?.data || [];
      setInvoices(
        items.filter((i: SalesInvoice) => {
          const outstanding = Number(i.outstandingAmount ?? Number(i.total || 0) - Number(i.amountPaid || 0));
          return !['DRAFT', 'CANCELLED', 'PAID'].includes(i.status) && outstanding > 0;
        })
      );
    } catch (err: any) {
      showApiError(err, 'Failed to load payments and pending invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.invoiceId) {
      toast.error('Please select an invoice to apply this payment to');
      return;
    }
    const numAmount = Number(form.amount);
    if (!form.amount || Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a payment amount greater than zero');
      return;
    }

    const targetInvoice = invoices.find((i) => i.id === form.invoiceId);
    if (targetInvoice) {
      const maxDue = Number(
        targetInvoice.outstandingAmount ??
          Number(targetInvoice.total || 0) - Number(targetInvoice.amountPaid || 0)
      );
      if (numAmount > maxDue) {
        toast.error(`Payment amount exceeds the invoice outstanding balance of ${formatCurrency(maxDue, targetInvoice.currency)}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/invoicing/payments', { ...form, amount: numAmount, type: 'RECEIVED' });
      showApiSuccess('Payment recorded successfully');
      setShowModal(false);
      setForm({
        invoiceId: '',
        amount: '',
        method: 'BANK_TRANSFER',
        date: new Date().toISOString().split('T')[0],
        reference: '',
      });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'paymentNo',
      header: 'Payment #',
      render: (p: Payment) => <span className="font-mono text-sm font-semibold">{p.paymentNo}</span>,
    },
    { key: 'date', header: 'Date', render: (p: Payment) => formatDate(p.date) },
    {
      key: 'amount',
      header: 'Amount',
      render: (p: Payment) => (
        <span className="font-semibold text-green-700">{formatCurrency(p.amount, p.currency)}</span>
      ),
    },
    { key: 'method', header: 'Method', render: (p: Payment) => <StatusBadge status={p.method} /> },
    { key: 'type', header: 'Type', render: (p: Payment) => <StatusBadge status={p.type} /> },
    { key: 'reference', header: 'Reference', render: (p: Payment) => p.reference || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track received and made payments against sales and purchase invoices"
        action={{ label: 'Record Payment', onClick: () => setShowModal(true), icon: Plus }}
      />
      {payments.length === 0 && !isLoading ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Record your first customer payment against an unpaid sales invoice"
          action={{ label: 'Record Payment', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={payments} isLoading={isLoading} />
          {total > limit && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {invoices.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No pending or unpaid sales invoices found. Create and submit an invoice first.</span>
              </div>
              <Link
                href="/invoicing/sales-invoices/new"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Invoice <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Invoice *</Label>
              <Select
                value={form.invoiceId}
                onValueChange={(v) => {
                  const inv = invoices.find((i) => i.id === v);
                  const due = inv
                    ? Number(inv.outstandingAmount ?? Number(inv.total || 0) - Number(inv.amountPaid || 0))
                    : '';
                  setForm((f) => ({ ...f, invoiceId: v, amount: due ? String(due) : f.amount }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.length === 0 ? (
                    <SelectEmptyState
                      message="No unpaid invoices found"
                      linkHref="/invoicing/sales-invoices/new"
                      linkText="Create Invoice"
                    />
                  ) : (
                    invoices.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoiceNo} — {i.customer?.name} — {formatCurrency(Number(i.outstandingAmount ?? Number(i.total || 0) - Number(i.amountPaid || 0)), i.currency)} due
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method *</Label>
                <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  value={form.reference}
                  placeholder="e.g. UTR / Cheque #"
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || invoices.length === 0}>
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
