'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, RotateCcw, Trash2, Play, Printer, Repeat, Settings2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencySelect } from '@/components/ui/currency-select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { RecurringRunnerButton } from './AdvancedInvoicingPages';
import { LineItemGrid, LineItemRow, calculateLineSummary } from './LineItemGrid';

function asItems(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#4b5563]">{label}</Label>
      {children}
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="w-full justify-between"
    >
      <span>{label}</span>
      <span className="text-[10px] font-bold uppercase">{active ? 'ON' : 'OFF'}</span>
    </Button>
  );
}

function CrudShell({
  title,
  description,
  actionLabel,
  onAction,
  extraAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1f2937]">{title}</h1>
          <p className="text-sm text-[#6b7280]">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {extraAction}
          {actionLabel && onAction && (
            <Button onClick={onAction}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function TaxTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', scope: 'BOTH', description: '', isDefault: false });
  const [lines, setLines] = useState<any[]>([{ label: 'GST', rate: 18, chargeType: 'ON_NET_TOTAL', isRecoverable: false }]);

  const fetchTemplates = () => {
    setIsLoading(true);
    api
      .get('/invoicing/tax-templates')
      .then((res) => setTemplates(asItems(res.data)))
      .catch((err) => showApiError(err, 'Failed to load tax templates'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const create = async () => {
    if (isSubmitting) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error('Please enter template name');
      return;
    }
    const trimmedCode = form.code.trim();
    if (!trimmedCode) {
      toast.error('Please enter template code');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/invoicing/tax-templates', {
        name: trimmedName,
        code: trimmedCode,
        scope: form.scope,
        description: form.description,
        isDefault: form.isDefault,
        lines,
      });
      showApiSuccess(`Tax template "${trimmedName}" created successfully`);
      setOpen(false);
      setForm({ name: '', code: '', scope: 'BOTH', description: '', isDefault: false });
      setLines([{ label: 'GST', rate: 18, chargeType: 'ON_NET_TOTAL', isRecoverable: false }]);
      fetchTemplates();
    } catch (err: any) {
      showApiError(err, 'Failed to create tax template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CrudShell
      title="Tax Templates"
      description="Reusable GST/tax templates used by invoice line items."
      actionLabel="New Template"
      onAction={() => setOpen(true)}
    >
      <DataTable
        data={templates}
        isLoading={isLoading}
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'name', header: 'Name' },
          { key: 'scope', header: 'Scope' },
          {
            key: 'lines',
            header: 'Rates',
            render: (t: any) => t.lines?.map((l: any) => `${l.label} ${l.rate}%`).join(', ') || '-',
          },
          {
            key: 'isActive',
            header: 'Status',
            render: (t: any) => <StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} />,
          },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Tax Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Name *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="GST 18% Intrastate"
                  required
                />
              </Field>
              <Field label="Code *">
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="GST-18-INTRA"
                  required
                />
              </Field>
              <Field label="Scope">
                <Select value={form.scope} onValueChange={(scope) => setForm((f) => ({ ...f, scope }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['ITEM', 'INVOICE', 'BOTH'].map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {scope}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Usage note, jurisdiction, GST treatment, export rule..."
              />
            </Field>
            <div className="rounded-md border border-[#e5e2dc] bg-white">
              <div className="grid grid-cols-[2fr_110px_190px_120px_44px] border-b border-[#e5e2dc] bg-[#f8faf9] px-3 py-2 text-xs font-semibold uppercase text-[#6b7280]">
                <span>Tax Row</span>
                <span>Rate %</span>
                <span>Charge Type</span>
                <span>Recoverable</span>
                <span />
              </div>
              <div className="divide-y divide-[#f0ede8]">
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-[2fr_110px_190px_120px_44px] gap-2 px-3 py-2">
                    <Input
                      value={line.label}
                      onChange={(event) =>
                        setLines((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, label: event.target.value } : row))
                        )
                      }
                      placeholder="CGST"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={line.rate}
                      onChange={(event) =>
                        setLines((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, rate: Number(event.target.value) } : row))
                        )
                      }
                    />
                    <Select
                      value={line.chargeType}
                      onValueChange={(chargeType) =>
                        setLines((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, chargeType } : row))
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['ON_NET_TOTAL', 'ON_PREVIOUS_ROW_AMOUNT', 'ON_PREVIOUS_ROW_TOTAL'].map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replaceAll('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant={line.isRecoverable ? 'default' : 'outline'}
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((row, i) => (i === index ? { ...row, isRecoverable: !row.isRecoverable } : row))
                        )
                      }
                    >
                      {line.isRecoverable ? 'Yes' : 'No'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e5e2dc] p-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      { label: '', rate: 0, chargeType: 'ON_NET_TOTAL', isRecoverable: false },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Row
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CrudShell>
  );
}

export function CreditNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    originalInvoiceId: '',
    reason: 'SALES_RETURN',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [rows, setRows] = useState<any[]>([
    { productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 },
  ]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [noteRes, invoiceRes] = await Promise.all([
        api.get('/invoicing/credit-notes'),
        api.get('/invoices', { params: { limit: 200 } }),
      ]);
      setNotes(asItems(noteRes.data));
      setInvoices(asItems(invoiceRes.data).filter((invoice: any) => !['DRAFT', 'CANCELLED'].includes(invoice.status)));
    } catch (err: any) {
      showApiError(err, 'Failed to load credit notes and invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedInvoice = invoices.find((invoice) => invoice.id === form.originalInvoiceId);
  const previewTotal = rows.reduce((sum, row) => {
    const net = Number(row.quantity || 0) * Number(row.unitPrice || 0) * (1 - Number(row.discount || 0) / 100);
    return sum + net + (net * Number(row.taxRate || 0)) / 100;
  }, 0);

  const reset = () => {
    setForm({ originalInvoiceId: '', reason: 'SALES_RETURN', date: new Date().toISOString().slice(0, 10), notes: '' });
    setRows([{ productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const selectInvoice = (invoiceId: string) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    setForm((prev) => ({ ...prev, originalInvoiceId: invoiceId }));
    if (invoice?.items?.length) {
      setRows(
        invoice.items.map((item: any) => ({
          productId: item.productId,
          itemCode: item.itemCode || item.product?.sku || '',
          description: item.description || item.product?.name || '',
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.rate || item.unitPrice || 0),
          discount: Number(item.discount || 0),
          taxRate: Number(item.taxRate || 0),
        }))
      );
    }
  };

  const create = async () => {
    if (isSubmitting) return;

    if (!form.originalInvoiceId) {
      toast.error('Select the original submitted invoice to credit');
      return;
    }
    const items = rows
      .filter((row) => row.productId && Number(row.quantity) > 0)
      .map((row) => ({
        productId: row.productId,
        itemCode: row.itemCode,
        description: row.description,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        discount: Number(row.discount || 0),
        taxRate: Number(row.taxRate || 0),
      }));

    if (!items.length) {
      toast.error('Add at least one credit item with quantity greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/invoicing/credit-notes/from-invoice/${form.originalInvoiceId}`, { ...form, items });
      showApiSuccess('Draft credit note created successfully');
      setOpen(false);
      reset();
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/invoicing/credit-notes/${id}/status`, { status });
      showApiSuccess(`Credit note ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to update credit note');
    }
  };

  return (
    <CrudShell
      title="Credit Notes"
      description="Create customer credits from submitted invoices, then submit to reduce receivables and post ledger reversal."
      actionLabel="New Credit Note"
      onAction={() => setOpen(true)}
    >
      {notes.length || isLoading ? (
        <DataTable
          data={notes}
          isLoading={isLoading}
          columns={[
            { key: 'creditNoteNo', header: 'Credit Note #' },
            { key: 'customer', header: 'Customer', render: (n: any) => n.customer?.name || '-' },
            { key: 'originalInvoice', header: 'Invoice', render: (n: any) => n.originalInvoice?.invoiceNo || '-' },
            { key: 'reason', header: 'Reason', render: (n: any) => n.reason?.replaceAll('_', ' ') || '-' },
            { key: 'date', header: 'Date', render: (n: any) => formatDate(n.date) },
            { key: 'status', header: 'Status', render: (n: any) => <StatusBadge status={n.status} /> },
            { key: 'grandTotal', header: 'Total', render: (n: any) => formatCurrency(n.grandTotal, n.currency) },
            {
              key: 'actions',
              header: '',
              render: (n: any) => (
                <div className="flex justify-end gap-2">
                  {n.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => setStatus(n.id, 'SUBMITTED')}>
                      Submit
                    </Button>
                  )}
                  {n.status === 'SUBMITTED' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(n.id, 'CANCELLED')}>
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No credit notes"
          description="Create a credit note from a submitted invoice for returns, corrections, or goodwill credits."
          action={{ label: 'New Credit Note', onClick: () => setOpen(true) }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>New Credit Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm text-[#4b5563]">
              Select a submitted invoice. The invoice rows are copied so you can credit the full invoice or reduce quantities for a partial return.
            </div>

            {invoices.length === 0 && !isLoading && (
              <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>No submitted sales invoices found to credit against. Create and submit an invoice first.</span>
                </div>
                <Link
                  href="/invoicing/sales-invoices/new"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
                >
                  Create Invoice <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Original Invoice *">
                <Select value={form.originalInvoiceId} onValueChange={selectInvoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select submitted invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.length === 0 ? (
                      <SelectEmptyState
                        message="No submitted invoices found"
                        linkHref="/invoicing/sales-invoices/new"
                        linkText="Create Invoice"
                      />
                    ) : (
                      invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNo} · {invoice.customer?.name || 'Customer'} ·{' '}
                          {formatCurrency(invoice.grandTotal || invoice.total, invoice.currency)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reason">
                <Select value={form.reason} onValueChange={(reason) => setForm((prev) => ({ ...prev, reason }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['SALES_RETURN', 'RATE_ADJUSTMENT', 'DISCOUNT', 'TAX_CORRECTION', 'FULL_REVERSAL', 'OTHER'].map(
                      (reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason.replaceAll('_', ' ')}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </Field>
              <div className="md:col-span-3">
                <Field label="Notes">
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Return reason, correction reference, approval note"
                  />
                </Field>
              </div>
            </div>

            {selectedInvoice && (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Crediting against {selectedInvoice.invoiceNo}. Invoice total:{' '}
                {formatCurrency(selectedInvoice.grandTotal || selectedInvoice.total, selectedInvoice.currency)}.
              </div>
            )}

            <CreditRows rows={rows} onChange={setRows} currency={selectedInvoice?.currency || 'INR'} />
            <div className="flex items-center justify-between">
              <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] px-3 py-2 text-sm">
                Draft credit preview:{' '}
                <span className="font-semibold">
                  {formatCurrency(previewTotal, selectedInvoice?.currency || 'INR')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={create} disabled={isSubmitting || invoices.length === 0}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Creating...' : 'Create Draft Credit'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CrudShell>
  );
}

function CreditRows({ rows, onChange, currency }: { rows: any[]; onChange: (rows: any[]) => void; currency: string }) {
  const update = (index: number, patch: any) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => onChange(rows.length === 1 ? rows : rows.filter((_, i) => i !== index));
  return (
    <div className="rounded-md border border-[#e5e2dc] bg-white">
      <div className="grid grid-cols-[1.2fr_2fr_90px_110px_90px_90px_120px_44px] border-b border-[#e5e2dc] bg-[#f8faf9] px-3 py-2 text-xs font-semibold uppercase text-[#6b7280]">
        <span>Item</span>
        <span>Description</span>
        <span>Qty</span>
        <span>Rate</span>
        <span>Disc %</span>
        <span>Tax %</span>
        <span>Total</span>
        <span />
      </div>
      <div className="divide-y divide-[#f0ede8]">
        {rows.map((row, index) => {
          const net = Number(row.quantity || 0) * Number(row.unitPrice || 0) * (1 - Number(row.discount || 0) / 100);
          const total = net + (net * Number(row.taxRate || 0)) / 100;
          return (
            <div key={index} className="grid grid-cols-[1.2fr_2fr_90px_110px_90px_90px_120px_44px] gap-2 px-3 py-2">
              <Input
                value={row.itemCode || ''}
                onChange={(event) => update(index, { itemCode: event.target.value })}
                readOnly
              />
              <Input
                value={row.description || ''}
                onChange={(event) => update(index, { description: event.target.value })}
              />
              <Input
                type="number"
                min="0.000001"
                step="0.000001"
                value={row.quantity}
                onChange={(event) => update(index, { quantity: Number(event.target.value) })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.unitPrice}
                onChange={(event) => update(index, { unitPrice: Number(event.target.value) })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.discount}
                onChange={(event) => update(index, { discount: Number(event.target.value) })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.taxRate}
                onChange={(event) => update(index, { taxRate: Number(event.target.value) })}
              />
              <div className="flex items-center font-semibold">{formatCurrency(total, currency)}</div>
              <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get('/invoicing/ledger')
      .then((res) => setEntries(asItems(res.data)))
      .catch((err) => showApiError(err, 'Failed to load general ledger'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <CrudShell
      title="General Ledger"
      description="Immutable accounting entries posted by invoices, payments, and credit notes."
    >
      <DataTable
        data={entries}
        isLoading={isLoading}
        columns={[
          { key: 'postingDate', header: 'Date', render: (e: any) => formatDate(e.postingDate) },
          {
            key: 'account',
            header: 'Account',
            render: (e: any) => (e.account ? `${e.account.code} - ${e.account.name}` : e.accountId),
          },
          { key: 'voucherType', header: 'Voucher Type' },
          { key: 'debit', header: 'Debit', render: (e: any) => formatCurrency(e.debit, e.currency) },
          { key: 'credit', header: 'Credit', render: (e: any) => formatCurrency(e.credit, e.currency) },
          { key: 'remarks', header: 'Remarks', render: (e: any) => e.remarks || '-' },
        ]}
      />
    </CrudShell>
  );
}

export function PrintFormatsPage() {
  const [formats, setFormats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: 'Default GST Invoice',
    docType: 'SALES_INVOICE',
    title: 'Tax Invoice',
    footer: 'Thank you for your business.',
    isDefault: true,
    isActive: true,
    showLogo: true,
    showHsnSummary: true,
    showAmountInWords: true,
    showPaymentTerms: true,
  });

  const fetchFormats = () => {
    setIsLoading(true);
    api
      .get('/invoicing/print-formats')
      .then((res) => setFormats(asItems(res.data)))
      .catch((err) => showApiError(err, 'Failed to load print formats'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  const create = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/invoicing/print-formats', {
        name: form.name,
        docType: form.docType,
        isDefault: form.isDefault || formats.filter((f) => f.docType === form.docType).length === 0,
        isActive: form.isActive,
        footer: form.footer,
        template: {
          title: form.title,
          sections: ['letterhead', 'customer', 'items', 'taxes', 'totals', 'terms', 'footer'],
          showLogo: form.showLogo,
          showHsnSummary: form.showHsnSummary,
          showAmountInWords: form.showAmountInWords,
          showPaymentTerms: form.showPaymentTerms,
        },
      });
      showApiSuccess('Print format created successfully');
      setOpen(false);
      fetchFormats();
    } catch (err: any) {
      showApiError(err, 'Failed to create format');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patchFormat = async (id: string, payload: any) => {
    try {
      await api.patch(`/invoicing/print-formats/${id}`, payload);
      showApiSuccess('Print format updated');
      fetchFormats();
    } catch (err: any) {
      showApiError(err, 'Failed to update format');
    }
  };

  return (
    <CrudShell
      title="Print Formats"
      description="Reusable PDF layouts. The default active Sales Invoice format is used by the invoice PDF endpoint."
      actionLabel="New Format"
      onAction={() => setOpen(true)}
    >
      <DataTable
        data={formats}
        isLoading={isLoading}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'docType', header: 'Document' },
          {
            key: 'template',
            header: 'Layout',
            render: (f: any) => f.template?.title || f.template?.sections?.join(', ') || 'Standard',
          },
          {
            key: 'isDefault',
            header: 'Default',
            render: (f: any) =>
              f.isDefault ? (
                <StatusBadge status="DEFAULT" />
              ) : (
                <Button size="sm" variant="outline" onClick={() => patchFormat(f.id, { isDefault: true })}>
                  Make Default
                </Button>
              ),
          },
          {
            key: 'isActive',
            header: 'Status',
            render: (f: any) => <StatusBadge status={f.isActive ? 'ACTIVE' : 'INACTIVE'} />,
          },
          {
            key: 'actions',
            header: '',
            render: (f: any) => (
              <Button size="sm" variant="outline" onClick={() => patchFormat(f.id, { isActive: !f.isActive })}>
                {f.isActive ? 'Disable' : 'Enable'}
              </Button>
            ),
          },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Print Format</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Document">
                <Select value={form.docType} onValueChange={(docType) => setForm((f) => ({ ...f, docType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['SALES_INVOICE', 'CREDIT_NOTE', 'PAYMENT_ENTRY'].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </Field>
            </div>
            <Field label="Footer">
              <Textarea
                rows={2}
                value={form.footer}
                onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
              />
            </Field>
            <div className="grid gap-2 md:grid-cols-4">
              <ToggleButton
                active={form.isDefault}
                label="Default"
                onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
              />
              <ToggleButton
                active={form.showLogo}
                label="Logo"
                onClick={() => setForm((f) => ({ ...f, showLogo: !f.showLogo }))}
              />
              <ToggleButton
                active={form.showHsnSummary}
                label="HSN Summary"
                onClick={() => setForm((f) => ({ ...f, showHsnSummary: !f.showHsnSummary }))}
              />
              <ToggleButton
                active={form.showAmountInWords}
                label="Amount in Words"
                onClick={() => setForm((f) => ({ ...f, showAmountInWords: !f.showAmountInWords }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={isSubmitting}>
                <Printer className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Creating...' : 'Create Format'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CrudShell>
  );
}

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    customerId: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    nextRunDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    currency: 'INR',
    autoSubmit: false,
    notes: '',
    terms: '',
  });
  const [rows, setRows] = useState<LineItemRow[]>([
    { productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, total: 0 },
  ]);
  const summary = useMemo(() => calculateLineSummary(rows), [rows]);

  const fetchSubscriptions = () => {
    setIsLoading(true);
    api
      .get('/invoicing/subscriptions')
      .then((res) => setSubscriptions(asItems(res.data)))
      .catch((err) => showApiError(err, 'Failed to load subscriptions'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions();
    api
      .get('/customers', { params: { limit: 200, isActive: true } })
      .then((res) => setCustomers(asItems(res.data)))
      .catch((err) => showApiError(err, 'Failed to load customers'));
  }, []);

  const createSubscription = async () => {
    if (isSubmitting) return;

    if (!form.customerId) {
      toast.error('Select a customer');
      return;
    }
    const items = rows
      .filter((row) => row.productId || row.itemCode || row.description)
      .map((row) => ({
        productId: row.productId,
        itemCode: row.itemCode,
        description: row.description,
        quantity: Number(row.quantity || 1),
        unitPrice: Number(row.unitPrice || 0),
        discount: Number(row.discount || 0),
        taxRate: Number(row.taxRate || 0),
        taxTemplateId: row.taxTemplateId,
      }));

    if (!items.length) {
      toast.error('Add at least one subscription item');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/invoicing/subscriptions', {
        ...form,
        endDate: form.endDate || undefined,
        items,
      });
      showApiSuccess('Subscription created successfully');
      setOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      showApiError(err, 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubscription = async (subscription: any) => {
    try {
      await api.patch(`/invoicing/subscriptions/${subscription.id}`, { isActive: !subscription.isActive });
      showApiSuccess(`Subscription ${!subscription.isActive ? 'resumed' : 'paused'}`);
      fetchSubscriptions();
    } catch (err: any) {
      showApiError(err, 'Failed to update subscription');
    }
  };

  return (
    <CrudShell
      title="Recurring Invoices"
      description="Templates that generate real sales invoices on schedule, with optional auto-submit."
      actionLabel="New Subscription"
      onAction={() => setOpen(true)}
      extraAction={<RecurringRunnerButton onDone={fetchSubscriptions} />}
    >
      {subscriptions.length || isLoading ? (
        <DataTable
          data={subscriptions}
          isLoading={isLoading}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'customer', header: 'Customer', render: (s: any) => s.customer?.name || s.customerId },
            { key: 'frequency', header: 'Frequency' },
            { key: 'nextRunDate', header: 'Next Run', render: (s: any) => formatDate(s.nextRunDate) },
            { key: 'autoSubmit', header: 'Mode', render: (s: any) => (s.autoSubmit ? 'Auto submit' : 'Draft first') },
            {
              key: 'generatedInvoices',
              header: 'Generated',
              render: (s: any) =>
                s.generatedInvoices?.length
                  ? s.generatedInvoices
                      .map((run: any) => run.invoice?.invoiceNo)
                      .filter(Boolean)
                      .join(', ')
                  : '-',
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (s: any) => <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />,
            },
            {
              key: 'actions',
              header: '',
              render: (s: any) => (
                <Button size="sm" variant="outline" onClick={() => toggleSubscription(s)}>
                  {s.isActive ? 'Pause' : 'Resume'}
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No subscriptions"
          description="Recurring invoice templates will appear here."
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>New Recurring Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {customers.length === 0 && !isLoading && (
              <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>No customers found. Create a customer first to set up recurring billing.</span>
                </div>
                <Link
                  href="/customers"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
                >
                  Create Customer <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Name *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Monthly support retainer"
                  required
                />
              </Field>
              <Field label="Customer *">
                <Select
                  value={form.customerId}
                  onValueChange={(customerId) => {
                    const customer = customers.find((c) => c.id === customerId);
                    setForm((f) => ({
                      ...f,
                      customerId,
                      currency: customer?.currency || f.currency,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectEmptyState
                        message="No customers found"
                        linkHref="/customers"
                        linkText="Create Customer"
                      />
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Frequency">
                <Select
                  value={form.frequency}
                  onValueChange={(frequency) => setForm((f) => ({ ...f, frequency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <CurrencySelect
                  value={form.currency}
                  onChange={(currency) => setForm((f) => ({ ...f, currency }))}
                />
              </Field>
              <Field label="Start Date">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </Field>
              <Field label="Next Run Date">
                <Input
                  type="date"
                  value={form.nextRunDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextRunDate: e.target.value }))}
                />
              </Field>
              <Field label="End Date (Optional)">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoSubmitCheckbox"
                checked={form.autoSubmit}
                onChange={(e) => setForm((f) => ({ ...f, autoSubmit: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoSubmitCheckbox" className="text-sm font-medium text-[#1f2937] cursor-pointer">
                Automatically submit generated invoices upon recurring run
              </label>
            </div>

            <LineItemGrid value={rows} onChange={setRows} currency={form.currency} />
            <div className="flex items-center justify-between">
              <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] px-3 py-2 text-sm">
                Subscription amount preview:{' '}
                <span className="font-semibold">{formatCurrency(summary.total, form.currency)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createSubscription} disabled={isSubmitting || customers.length === 0}>
                  {isSubmitting ? 'Creating...' : 'Create Subscription'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CrudShell>
  );
}
