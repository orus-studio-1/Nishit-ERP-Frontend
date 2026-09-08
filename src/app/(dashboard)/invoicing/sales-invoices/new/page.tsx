'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowUpRight, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import { LineItemGrid, LineItemRow, calculateLineSummary } from '@/components/invoicing/LineItemGrid';
import api from '@/lib/api';
import { Customer } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const initialRows: LineItemRow[] = [
  { productId: '', itemCode: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, total: 0 },
];

export default function NewSalesInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sourceOrder, setSourceOrder] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    currency: 'INR',
    notes: '',
    terms: '',
  });
  const [rows, setRows] = useState<LineItemRow[]>(initialRows);
  const summary = useMemo(() => calculateLineSummary(rows), [rows]);

  useEffect(() => {
    setIsLoadingCustomers(true);
    api
      .get('/customers', { params: { limit: 100, isActive: true } })
      .then((res) => setCustomers(res.data?.data?.items || res.data?.data || []))
      .catch((err) => showApiError(err, 'Failed to load customers'))
      .finally(() => setIsLoadingCustomers(false));
  }, []);

  useEffect(() => {
    const salesOrderId = new URLSearchParams(window.location.search).get('salesOrderId');
    if (!salesOrderId) return;
    setIsLoadingOrder(true);
    api.get(`/sales/orders/${salesOrderId}`)
      .then((res) => {
        const order = res.data?.data;
        if (!order) throw new Error('Sales order was not found');
        const remainingRows = (order.items || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          itemCode: item.product?.sku || item.itemCode || '',
          description: item.description || item.product?.name || '',
          hsnCode: item.hsnCode || item.product?.hsnCode || '',
          brand: item.brand || item.product?.brand || item.product?.manufacturer || '',
          quantity: Math.max(0, Number(item.quantity) - Number(item.billedQty || 0)),
          unitPrice: Number(item.unitPrice || 0),
          discount: Number(item.discount || 0),
          taxRate: Number(item.taxRate || 0),
          total: 0,
        })).filter((item: LineItemRow) => item.quantity > 0);
        setSourceOrder(order);
        setForm((current) => ({ ...current, customerId: order.customerId, currency: order.currency || 'INR', terms: order.terms || '', notes: order.notes || '', dueDate: order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : '' }));
        setRows(remainingRows);
      })
      .catch((err) => showApiError(err, 'Failed to load the source sales order'))
      .finally(() => setIsLoadingOrder(false));
  }, []);

  const createInvoice = async () => {
    if (isSaving) return;

    if (!form.customerId) {
      toast.error('Please select a customer for this invoice');
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
        taxTemplateId: row.taxTemplateId,
        taxRate: Number(row.taxRate || 0),
        discount: Number(row.discount || 0),
      }));

    if (!items.length) {
      toast.error('Add at least one line item with a product, description, and price');
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`Item quantity must be greater than 0`);
        return;
      }
      if (item.unitPrice < 0) {
        toast.error(`Item unit price cannot be negative`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = sourceOrder
        ? await api.post(`/invoices/from-sales-order/${sourceOrder.id}`, {
            items: rows.filter((row) => row.id && Number(row.quantity) > 0).map((row) => ({ salesOrderItemId: row.id, quantity: Number(row.quantity) })),
          })
        : await api.post('/invoices', { ...form, items });
      const invoice = res.data?.data;
      showApiSuccess('Draft invoice created successfully');
      router.push(`/invoicing/sales-invoices/${invoice.id}`);
    } catch (err: any) {
      showApiError(err, 'Failed to create invoice');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/invoicing/sales-invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to invoices
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-[#1f2937]">New Sales Invoice</h1>
          <p className="text-sm text-[#6b7280]">{sourceOrder ? `Create a linked invoice for ${sourceOrder.orderNo}. Quantities cannot exceed the unbilled balance.` : 'Create a draft invoice. Totals are confirmed by the backend after save.'}</p>
        </div>
        <Button onClick={createInvoice} disabled={isSaving || isLoadingOrder || customers.length === 0}>
          {isLoadingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isLoadingOrder ? 'Loading Order...' : isSaving ? 'Creating Draft...' : 'Create Draft'}
        </Button>
      </div>

      {customers.length === 0 && !isLoadingCustomers && (
        <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>No customers found. You must create at least one customer before generating sales invoices.</span>
          </div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
          >
            Create Customer <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select
                value={form.customerId}
                disabled={Boolean(sourceOrder)}
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.id === value);
                  setForm((prev) => ({
                    ...prev,
                    customerId: value,
                    currency: customer?.currency || prev.currency,
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
                        {customer.name} {customer.customerNo ? `(${customer.customerNo})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect
                value={form.currency}
                onChange={(currency) => setForm((prev) => ({ ...prev, currency }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                placeholder="Internal notes or customer remarks"
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Terms</Label>
              <Input
                value={form.terms}
                placeholder="Payment terms, delivery terms, bank instructions"
                onChange={(event) => setForm((prev) => ({ ...prev, terms: event.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemGrid value={rows} onChange={setRows} currency={form.currency} />
          <div className="mt-3 flex justify-end text-sm">
            <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] px-4 py-2">
              Draft total preview: <span className="font-semibold">{formatCurrency(summary.total, form.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
