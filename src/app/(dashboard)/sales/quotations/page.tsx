'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, AlertCircle, ArrowRight, Pencil, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { LineItemGrid, LineItemRow } from '@/components/invoicing/LineItemGrid';
import api from '@/lib/api';
import { Quotation } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotationDefaults, setQuotationDefaults] = useState<any>({});
  const [sourceQuotation, setSourceQuotation] = useState<Quotation | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [actionDialog, setActionDialog] = useState<{ quotation: Quotation; operation: 'send' | 'reject' } | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    date: new Date().toISOString().slice(0, 10),
    validUntil: '',
    currency: 'INR',
    customerNameSnapshot: '', customerSiteAddress: '', deliveryTerms: '', deliveryCharges: 0, deliveryChargesNote: '',
    notes: '',
    terms: '',
  });
  const [rows, setRows] = useState<LineItemRow[]>([
    { productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, total: 0 },
  ]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/sales/quotations', { params: { page, limit } });
      setQuotations(res.data?.data?.items || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err: any) {
      showApiError(err, 'Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const [res, tenant] = await Promise.all([api.get('/customers', { params: { limit: 200, isActive: true } }), api.get('/platform/tenant')]);
      setCustomers(res.data?.data?.items || res.data?.data || []);
      setQuotationDefaults(tenant.data?.data?.companies?.[0]?.quotationDefaults || {});
    } catch (err: any) {
      showApiError(err, 'Failed to load customers');
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleConvert = async () => {
    if (!sourceQuotation || isConverting) return;
    setIsConverting(true);
    try {
      const res = await api.post(`/sales-orders/from-quotation/${sourceQuotation.id}`);
      const order = res.data?.data;
      showApiSuccess('Quotation successfully converted to Sales Order');
      setSourceQuotation(null);
      if (order?.id) {
        router.push(`/sales/orders?created=${order.id}`);
      } else {
        router.push('/sales/orders');
      }
    } catch (err: any) {
      showApiError(err, 'Failed to convert quotation to sales order');
    } finally {
      setIsConverting(false);
    }
  };

  const quotationAction = async (quotation: Quotation, operation: 'submit' | 'send' | 'accept' | 'reject' | 'revise') => {
    try {
      const body: Record<string, string> = {};
      if (operation === 'reject') body.reason = actionValue.trim();
      if (operation === 'send') body.email = actionValue.trim();
      if ((operation === 'reject' || operation === 'send') && !actionValue.trim()) return toast.error(operation === 'send' ? 'Customer email is required' : 'Lost reason is required');
      await api.post(`/sales/quotations/${quotation.id}/${operation}`, body);
      showApiSuccess(`Quotation ${operation} completed`);
      fetchQuotations();
      setActionDialog(null);
      setActionValue('');
    } catch (err: any) {
      showApiError(err, `Quotation ${operation} failed`);
    }
  };
  const openPdf = async (quotation: Quotation) => { try { const response = await api.get(`/sales/quotations/${quotation.id}/artifact`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (error) { showApiError(error, 'Send the quotation once to generate its preserved PDF'); } };

  const createQuotation = async () => {
    if (isSubmitting) return;

    if (!form.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.date) {
      toast.error('Please select a quotation date');
      return;
    }
    if (form.validUntil && new Date(form.validUntil) < new Date(form.date)) {
      toast.error('Valid Until date cannot be before Quotation date');
      return;
    }

    const items = rows
      .filter((row) => (row.itemCode && row.itemCode.trim()) || (row.description && row.description.trim()) || row.productId)
      .map((row) => ({
        productId: row.productId || undefined,
        itemCode: row.itemCode?.trim() || undefined,
        description: row.description?.trim() || undefined,
        quantity: Number(row.quantity || 0),
        unitPrice: Number(row.unitPrice || 0),
        taxTemplateId: row.taxTemplateId || undefined,
        taxRate: Number(row.taxRate || 0),
        discount: Number(row.discount || 0),
        hsnCode: row.hsnCode?.trim() || undefined,
        brand: row.brand?.trim() || undefined,
      }));

    if (!items.length) {
      toast.error('Please add at least one line item with a code or description');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (items[i].quantity <= 0) {
        toast.error(`Line ${i + 1}: Quantity must be greater than zero`);
        return;
      }
      if (items[i].unitPrice < 0) {
        toast.error(`Line ${i + 1}: Unit price cannot be negative`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const body = { ...form, currency: 'INR', shippingAddressSnapshot: { address: form.customerSiteAddress }, items };
      if (editingQuotation) await api.put(`/sales/quotations/${editingQuotation.id}`, body);
      else await api.post('/sales/quotations', body);
      showApiSuccess(`Quotation ${editingQuotation ? 'updated' : 'created'} successfully`);
      setNewOpen(false);
      setEditingQuotation(null);
      setForm({
        customerId: '',
        date: new Date().toISOString().slice(0, 10),
        validUntil: '',
        currency: 'INR',
        customerNameSnapshot: '', customerSiteAddress: '', deliveryTerms: '', deliveryCharges: 0, deliveryChargesNote: '',
        notes: '',
        terms: '',
      });
      setRows([
        { productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, total: 0 },
      ]);
      fetchQuotations();
    } catch (err: any) {
      showApiError(err, editingQuotation ? 'Failed to update quotation' : 'Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreate = () => { setEditingQuotation(null); setForm({ customerId: '', date: new Date().toISOString().slice(0, 10), validUntil: '', currency: 'INR', customerNameSnapshot: '', customerSiteAddress: '', deliveryTerms: quotationDefaults.deliveryTerms || '', deliveryCharges: 0, deliveryChargesNote: quotationDefaults.deliveryChargesNote || '', notes: '', terms: quotationDefaults.terms || '' }); setRows([{ productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, total: 0 }]); setNewOpen(true); };
  const openEdit = (quotation: Quotation) => { const q = quotation as any; setEditingQuotation(quotation); setForm({ customerId: quotation.customerId || '', date: String(quotation.date).slice(0, 10), validUntil: quotation.validUntil ? String(quotation.validUntil).slice(0, 10) : '', currency: 'INR', customerNameSnapshot: q.customerNameSnapshot || q.customer?.name || '', customerSiteAddress: q.shippingAddressSnapshot?.address || '', deliveryTerms: q.deliveryTerms || '', deliveryCharges: Number(q.deliveryCharges || 0), deliveryChargesNote: q.deliveryChargesNote || '', notes: quotation.notes || '', terms: quotation.terms || '' }); setRows((quotation.items || []).map((item: any) => ({ productId: item.productId || '', itemCode: item.itemCode || item.product?.sku || '', description: item.description || item.product?.name || '', hsnCode: item.hsnCode || item.product?.hsnCode || '', brand: item.brand || item.product?.brand || item.product?.manufacturer || '', quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discount: Number(item.discount || 0), taxRate: Number(item.taxRate || 0), total: Number(item.total || 0) }))); setNewOpen(true); };

  const columns = [
    {
      key: 'quotationNo',
      header: 'Quotation #',
      render: (q: Quotation) => <span className="font-mono text-sm font-semibold text-blue-600">{q.quotationNo}</span>,
    },
    { key: 'customer', header: 'Customer', render: (q: Quotation) => (q.customer as any)?.name || '—' },
    { key: 'date', header: 'Date', render: (q: Quotation) => formatDate(q.date) },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (q: Quotation) => (q.validUntil ? formatDate(q.validUntil) : '—'),
    },
    {
      key: 'total',
      header: 'Total',
      render: (q: Quotation) => <span className="font-semibold">{formatCurrency(q.total, q.currency)}</span>,
    },
    { key: 'status', header: 'Status', render: (q: Quotation) => <StatusBadge status={q.status} /> },
    {
      key: 'actions',
      header: '',
      render: (q: Quotation) => <div className="flex flex-wrap justify-end gap-1">
        {q.status === 'DRAFT' && !(q as any).submittedAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(q); }}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
        {q.status === 'DRAFT' && !(q as any).submittedAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); quotationAction(q, 'submit'); }}>Submit</Button>}
        {String(q.status) === 'APPROVED' && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionValue((q.customer as any)?.email || ''); setActionDialog({ quotation: q, operation: 'send' }); }}>Email Quotation</Button>}
        {['SENT', 'VIEWED', 'UNDER_NEGOTIATION', 'ACCEPTED', 'SUPERSEDED'].includes(String(q.status)) && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openPdf(q); }}><Download className="mr-1 h-3.5 w-3.5" />PDF</Button>}
        {q.status === 'SENT' && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); quotationAction(q, 'accept'); }}>Accept</Button>}
        {q.status === 'SENT' && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionValue(''); setActionDialog({ quotation: q, operation: 'reject' }); }}>Reject</Button>}
        {['SENT', 'ACCEPTED', 'REJECTED'].includes(q.status) && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); quotationAction(q, 'revise'); }}>Revise</Button>}
        {q.status === 'ACCEPTED' && <Button size="sm" onClick={(e) => { e.stopPropagation(); setSourceQuotation(q); }}>Create Sales Order</Button>}
      </div>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Create and manage customer quotations"
        action={{ label: 'New Quotation', onClick: openCreate, icon: Plus }}
      />
      {quotations.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No quotations found"
          description="Create sales quotations with pricing, taxes, and terms to send to customers."
          action={{ label: 'New Quotation', onClick: openCreate }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={quotations} isLoading={isLoading} />
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

      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionDialog?.operation === 'send' ? 'Email Quotation to Customer' : 'Record Rejection / Lost Reason'}</DialogTitle></DialogHeader>
          {actionDialog && <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-3 text-sm"><span className="font-mono font-semibold">{actionDialog.quotation.quotationNo}</span><span className="text-gray-500"> · {(actionDialog.quotation.customer as any)?.name}</span></div>
            <div className="space-y-1.5"><Label>{actionDialog.operation === 'send' ? 'Recipient email *' : 'Reason *'}</Label>{actionDialog.operation === 'send' ? <Input type="email" value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="customer@company.com" /> : <Textarea value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="Explain why the quotation was not accepted" rows={4} />}</div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button><Button onClick={() => quotationAction(actionDialog.quotation, actionDialog.operation)}>{actionDialog.operation === 'send' ? 'Send Quotation' : 'Record Rejection'}</Button></div>
          </div>}
        </DialogContent>
      </Dialog>

      {/* Convert Quotation to Sales Order Dialog */}
      <Dialog open={!!sourceQuotation} onOpenChange={() => setSourceQuotation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sales Order from Quotation?</DialogTitle>
          </DialogHeader>
          {sourceQuotation && (
            <div className="space-y-4">
              <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm space-y-1">
                <p>
                  <span className="text-[#6b7280]">Source Quotation:</span>{' '}
                  <span className="font-mono font-semibold">{sourceQuotation.quotationNo}</span>
                </p>
                <p>
                  <span className="text-[#6b7280]">Customer:</span>{' '}
                  {(sourceQuotation.customer as any)?.name || sourceQuotation.customerId}
                </p>
                <p>
                  <span className="text-[#6b7280]">Items:</span> {sourceQuotation.items?.length || 0}
                </p>
                <p>
                  <span className="text-[#6b7280]">Total Amount:</span>{' '}
                  <span className="font-semibold">{formatCurrency(sourceQuotation.total, sourceQuotation.currency)}</span>
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSourceQuotation(null)}>
                  Cancel
                </Button>
                <Button onClick={handleConvert} disabled={isConverting}>
                  {isConverting ? 'Converting...' : 'Confirm & Convert'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Quotation Dialog */}
      <Dialog open={newOpen} onOpenChange={(open) => { setNewOpen(open); if (!open) setEditingQuotation(null); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingQuotation ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
          </DialogHeader>

          {customers.length === 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No customers found. You need at least one customer to create a quotation.</span>
              </div>
              <Link
                href="/customers"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 text-xs"
              >
                <span>Create Customer</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <div className="grid gap-4 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select
                  value={form.customerId}
                  onValueChange={(value) => {
                    const customer = customers.find((c) => c.id === value);
                    setForm((prev) => ({
                      ...prev,
                      customerId: value,
                      currency: 'INR',
                      customerNameSnapshot: customer?.name || '',
                      customerSiteAddress: [customer?.address, customer?.city, customer?.state, customer?.zip].filter(Boolean).join(', '),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent searchable searchPlaceholder="Search customers…">
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
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quotation Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Customer name on quotation</Label><Input value={form.customerNameSnapshot} onChange={event => setForm(prev => ({ ...prev, customerNameSnapshot: event.target.value }))} /></div><div className="space-y-1.5"><Label>Customer site address</Label><Input value={form.customerSiteAddress} onChange={event => setForm(prev => ({ ...prev, customerSiteAddress: event.target.value }))} /></div></div>

            <LineItemGrid value={rows} onChange={setRows} currency={form.currency} />

            <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Delivery note / delivery terms</Label><Textarea value={form.deliveryTerms} onChange={event => setForm(prev => ({ ...prev, deliveryTerms: event.target.value }))} /></div><div className="space-y-1.5"><Label>Terms and conditions</Label><Textarea value={form.terms} onChange={event => setForm(prev => ({ ...prev, terms: event.target.value }))} /></div><div className="space-y-1.5"><Label>Delivery charges note</Label><Input value={form.deliveryChargesNote} onChange={event => setForm(prev => ({ ...prev, deliveryChargesNote: event.target.value }))} /></div><div className="space-y-1.5"><Label>Delivery charges amount (INR)</Label><Input type="number" min="0" step="0.01" value={form.deliveryCharges} onChange={event => setForm(prev => ({ ...prev, deliveryCharges: Number(event.target.value) }))} /></div></div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createQuotation} disabled={isSubmitting || customers.length === 0}>
                {isSubmitting ? 'Saving...' : editingQuotation ? 'Save Changes' : 'Create Quotation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
