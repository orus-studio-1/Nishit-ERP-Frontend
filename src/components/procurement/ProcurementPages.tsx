'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  HandCoins,
  Landmark,
  PackageCheck,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Settings,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';

export type ProcurementKind =
  | 'dashboard'
  | 'material-requests'
  | 'rfqs'
  | 'supplier-quotations'
  | 'blanket-purchase-orders'
  | 'purchase-orders'
  | 'purchase-receipts'
  | 'quality-inspections'
  | 'landed-cost-vouchers'
  | 'purchase-invoices'
  | 'supplier-payments'
  | 'payment-terms'
  | 'supplier-items'
  | 'communications'
  | 'settings'
  | 'tracker';

const config: Record<ProcurementKind, { title: string; description: string; endpoint: string; icon: any }> = {
  dashboard: {
    title: 'Procurement Dashboard',
    description: 'Request-to-pay cockpit across buying documents',
    endpoint: '/procurement/dashboard',
    icon: BarChart3,
  },
  'material-requests': {
    title: 'Material Requests',
    description: 'Manual and reorder-driven purchase demand',
    endpoint: '/procurement/material-requests',
    icon: ClipboardList,
  },
  rfqs: {
    title: 'Request for Quotations',
    description: 'Invite suppliers to quote requested items',
    endpoint: '/procurement/rfqs',
    icon: FileText,
  },
  'supplier-quotations': {
    title: 'Supplier Quotations',
    description: 'Supplier pricing, terms, validity, and comparison',
    endpoint: '/procurement/supplier-quotations',
    icon: Scale,
  },
  'blanket-purchase-orders': {
    title: 'Blanket Purchase Orders',
    description: 'Long-term supplier agreements by quantity and date range',
    endpoint: '/procurement/blanket-purchase-orders',
    icon: Landmark,
  },
  'purchase-orders': {
    title: 'Purchase Orders',
    description: 'Approved supplier commitments with receipt and billing tracking',
    endpoint: '/procurement/purchase-orders',
    icon: ClipboardCheck,
  },
  'purchase-receipts': {
    title: 'Purchase Receipts',
    description: 'Receive goods into warehouse and update stock ledger',
    endpoint: '/procurement/purchase-receipts',
    icon: PackageCheck,
  },
  'quality-inspections': {
    title: 'Quality Inspections',
    description: 'Accepted and rejected quantities before stock acceptance',
    endpoint: '/procurement/quality-inspections',
    icon: FileCheck2,
  },
  'landed-cost-vouchers': {
    title: 'Landed Cost Vouchers',
    description: 'Distribute freight, customs, insurance, and handling into item valuation',
    endpoint: '/procurement/landed-cost-vouchers',
    icon: Truck,
  },
  'purchase-invoices': {
    title: 'Purchase Invoices',
    description: 'Book supplier bills into Accounts Payable',
    endpoint: '/procurement/purchase-invoices',
    icon: Receipt,
  },
  'supplier-payments': {
    title: 'Supplier Payments',
    description: 'Advance and invoice payments against suppliers',
    endpoint: '/procurement/supplier-payments',
    icon: HandCoins,
  },
  'payment-terms': {
    title: 'Payment Terms',
    description: 'Reusable supplier payment schedules such as advance and delivery milestones',
    endpoint: '/procurement/payment-terms',
    icon: Landmark,
  },
  'supplier-items': {
    title: 'Supplier Item Codes',
    description: 'Map supplier item codes and names to your item master',
    endpoint: '/procurement/supplier-items',
    icon: PackageCheck,
  },
  communications: {
    title: 'Supplier Communications',
    description: 'RFQ correspondence, calls, notes, and supplier follow-ups',
    endpoint: '/procurement/communications',
    icon: FileText,
  },
  settings: {
    title: 'Buying Settings',
    description: 'Global buying controls, tolerances, defaults, and payment terms',
    endpoint: '/procurement/settings',
    icon: Settings,
  },
  tracker: {
    title: 'Procurement Tracker',
    description: 'Full document-chain visibility from MR to payment',
    endpoint: '/procurement/tracker',
    icon: RefreshCw,
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const blankLine = { productId: '', quantity: 1, unitPrice: 0, rate: 0, taxRate: 0, discount: 0, categoryCode: '', hsnCode: '', make: '', quantityTolerance: '', deliveryDate: '', uom: '' };

export function ProcurementPage({ kind }: { kind: ProcurementKind }) {
  const meta = config[kind];
  const [rows, setRows] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(defaultForm(kind));
  const [lines, setLines] = useState<any[]>([blankLine]);
  const [poOperation, setPoOperation] = useState<{ row: any; operation: 'dispatch' | 'receive-goods' | 'delay-follow-up' } | null>(null);
  const [poOperationForm, setPoOperationForm] = useState<any>({});

  async function load() {
    setLoading(true);
    try {
      const common = await Promise.allSettled([
        api.get('/suppliers', { params: { limit: 200 } }),
        api.get('/inventory/products', { params: { limit: 200 } }),
        api.get('/procurement/purchase-orders', { params: { limit: 200 } }),
        api.get('/procurement/purchase-receipts', { params: { limit: 200 } }),
        api.get('/procurement/purchase-invoices', { params: { limit: 200 } }),
        api.get('/inventory/warehouses'),
      ]);
      if (common[0].status === 'fulfilled') setSuppliers(common[0].value.data?.data?.items || []);
      if (common[1].status === 'fulfilled') setProducts(common[1].value.data?.data?.items || []);
      if (common[2].status === 'fulfilled') setOrders(common[2].value.data?.data?.items || []);
      if (common[3].status === 'fulfilled') setReceipts(common[3].value.data?.data?.items || []);
      if (common[4].status === 'fulfilled') setInvoices(common[4].value.data?.data?.items || []);
      if (common[5].status === 'fulfilled') setWarehouses(common[5].value.data?.data || []);

      const res = await api.get(meta.endpoint, {
        params: kind === 'settings' || kind === 'dashboard' || kind === 'tracker' ? undefined : { limit: 100 },
      });
      if (kind === 'dashboard') setDashboard(res.data?.data);
      else if (kind === 'settings') setSettings(res.data?.data);
      else setRows(Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, `Failed to load ${meta.title}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [kind]);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || line.rate || 0),
        0
      ),
    [lines]
  );

  async function create(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (usesSupplier(kind) && !form.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (needsLines(kind)) {
      const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
      if (!validLines.length) {
        toast.error('Please add at least one line item with a selected product and quantity > 0');
        return;
      }
    }

    if (kind === 'supplier-payments') {
      if (!form.amount || Number(form.amount) <= 0) {
        toast.error('Please enter a payment amount greater than 0');
        return;
      }
    }

    if (kind === 'purchase-receipts') {
      const missingBatch = lines.find((l: any) => {
        const prod = products.find((p: any) => p.id === l.productId);
        return prod?.hasBatchNo && !l.batchNo;
      });
      if (missingBatch) {
        toast.error('Internal Batch Number is required for items that track batches');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post(meta.endpoint, payloadFor(kind, form, lines));
      showApiSuccess(`${meta.title.replace(/s$/, '')} created successfully`);
      setOpen(false);
      setForm(defaultForm(kind));
      setLines([blankLine]);
      load();
    } catch (err: any) {
      showApiError(err, 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function status(id: string, value: string) {
    const path = statusPath(kind, id);
    if (!path) return;
    try {
      await api.patch(path, { status: value });
      showApiSuccess('Status updated successfully');
      load();
    } catch (err: any) {
      showApiError(err, 'Status update failed');
    }
  }

  async function operate(row: any, operation: string) {
    if (['dispatch', 'receive-goods', 'delay-follow-up'].includes(operation)) {
      setPoOperation({ row, operation: operation as any });
      setPoOperationForm(operation === 'receive-goods' ? { warehouseId: '', vehicleNo: '', challanNo: '', invoiceReference: '' } : operation === 'dispatch' ? { trackingReference: '', carrier: row.carrier || '', estimatedArrivalAt: '' } : { reason: '', estimatedArrivalAt: '' });
      return;
    }
    try {
      let body: any = {};
      await api.post(`/procurement/purchase-orders/${row.id}/${operation}`, body);
      showApiSuccess(operation === 'send' ? 'Purchase order email queued' : operation === 'dispatch' ? 'Goods-in-transit details saved' : operation === 'delay-follow-up' ? 'Supplier follow-up queued' : `Purchase order ${operation} completed`);
      load();
    } catch (err: any) {
      showApiError(err, `Purchase order ${operation} failed`);
    }
  }

  async function submitPoOperation() {
    if (!poOperation) return;
    const { row, operation } = poOperation;
    try {
      if (operation === 'receive-goods') {
        if (!poOperationForm.warehouseId) return toast.error('Receiving warehouse is required');
        const openItems = (row.items || []).map((item: any) => ({ purchaseOrderItemId: item.id, arrivedQty: Math.max(0, Number(item.quantity) - Number(item.receivedQty || 0) - Number(item.shortClosedQty || 0)) })).filter((item: any) => item.arrivedQty > 0);
        if (!openItems.length) return toast.error('Nothing remains to receive');
        const gateResponse = await api.post('/procurement/gate-entries', { purchaseOrderId: row.id, vehicleNo: poOperationForm.vehicleNo || undefined, transporter: row.carrier || undefined, challanNo: poOperationForm.challanNo || undefined, invoiceReference: poOperationForm.invoiceReference || undefined, items: openItems });
        const gateId = gateResponse.data?.data?.id;
        await api.post(`/procurement/gate-entries/${gateId}/validate`);
        await api.post(`/procurement/gate-entries/${gateId}/create-grn`, { warehouseId: poOperationForm.warehouseId });
        showApiSuccess('Gate entry validated and draft GRN created');
      } else {
        if (operation === 'dispatch' && !poOperationForm.trackingReference?.trim()) return toast.error('Tracking / LR reference is required');
        if (operation === 'delay-follow-up' && !poOperationForm.reason?.trim()) return toast.error('Delay reason is required');
        await api.post(`/procurement/purchase-orders/${row.id}/${operation}`, poOperationForm);
        showApiSuccess(operation === 'dispatch' ? 'Goods-in-transit details saved' : 'Supplier delay follow-up recorded');
      }
      setPoOperation(null);
      load();
    } catch (err: any) { showApiError(err, 'Purchase order operation failed'); }
  }

  async function rfqOperation(row: any, operation: string) {
    try {
      await api.post(`/procurement/rfqs/${row.id}/${operation}`);
      showApiSuccess(`RFQ ${operation} completed`);
      load();
    } catch (err: any) {
      showApiError(err, `RFQ ${operation} failed`);
    }
  }

  if (kind === 'dashboard') return <ProcurementDashboard meta={meta} data={dashboard} loading={loading} />;
  if (kind === 'settings') return <BuyingSettings data={settings} reload={load} />;
  if (kind === 'tracker') return <Tracker rows={rows} loading={loading} />;

  const missingSupplier = usesSupplier(kind) && suppliers.length === 0;
  const missingProduct = needsLines(kind) && products.length === 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={meta.title}
        description={meta.description}
        action={{ label: `New ${singular(meta.title)}`, onClick: () => setOpen(true), icon: Plus }}
      />
      <DataTable
        data={rows}
        isLoading={loading}
        columns={columnsFor(kind, status, operate, rfqOperation)}
        emptyMessage={`No ${meta.title.toLowerCase()} yet`}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New {singular(meta.title)}</DialogTitle>
          </DialogHeader>

          {missingSupplier && !loading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No suppliers found. Create a supplier first to record procurement documents.</span>
              </div>
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Supplier <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {missingProduct && !loading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No products found. Create items in your catalog before creating procurement orders.</span>
              </div>
              <Link
                href="/inventory/products"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Product <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={create} className="space-y-4">
            <DocumentFields
              kind={kind}
              form={form}
              setForm={setForm}
              suppliers={suppliers}
              products={products}
              orders={orders}
              receipts={receipts}
              invoices={invoices}
              warehouses={warehouses}
              setLines={setLines}
            />
            {needsLines(kind) && (
              <LineEditor
                kind={kind}
                lines={lines}
                setLines={setLines}
                products={products}
                total={total}
                currency={form.currency || 'INR'}
              />
            )}
            {kind === 'payment-terms' && <PaymentTermEditor lines={lines} setLines={setLines} />}
            {kind === 'landed-cost-vouchers' && <ChargeEditor lines={lines} setLines={setLines} />}
            <div className="flex justify-end gap-2 border-t border-[#e5e2dc] pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || (missingSupplier && kind !== 'material-requests' && kind !== 'rfqs')}
              >
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!poOperation} onOpenChange={(value) => !value && setPoOperation(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{poOperation?.operation === 'dispatch' ? 'Record Goods in Transit' : poOperation?.operation === 'receive-goods' ? 'Gate Entry and Goods Receipt' : 'Supplier Delay Follow-up'}</DialogTitle></DialogHeader>{poOperation && <div className="space-y-4"><div className="rounded-lg border bg-gray-50 p-3 text-sm"><span className="font-mono font-semibold">{poOperation.row.poNo}</span><span className="text-gray-500"> · {poOperation.row.supplier?.name}</span></div>
          {poOperation.operation === 'receive-goods' && <><div className="space-y-1.5"><Label>Receiving warehouse *</Label><Select value={poOperationForm.warehouseId || ''} onValueChange={(warehouseId) => setPoOperationForm({ ...poOperationForm, warehouseId })}><SelectTrigger><SelectValue placeholder="Select receiving warehouse" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem value={w.id} key={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-3">{[['Vehicle number', 'vehicleNo'], ['Challan number', 'challanNo'], ['Supplier invoice', 'invoiceReference']].map(([label, key]) => <div className="space-y-1.5" key={key}><Label>{label}</Label><Input value={poOperationForm[key] || ''} onChange={e => setPoOperationForm({ ...poOperationForm, [key]: e.target.value })} /></div>)}</div><div className="rounded-lg border"><div className="grid grid-cols-[1fr_100px] bg-gray-50 p-2 text-xs font-semibold uppercase text-gray-500"><span>Item</span><span>Open quantity</span></div>{poOperation.row.items?.map((item: any) => <div className="grid grid-cols-[1fr_100px] border-t p-2 text-sm" key={item.id}><span>{item.product?.name || item.description}</span><span>{Math.max(0, Number(item.quantity) - Number(item.receivedQty || 0) - Number(item.shortClosedQty || 0))}</span></div>)}</div></>}
          {poOperation.operation === 'dispatch' && <div className="grid gap-3 sm:grid-cols-2">{[['Tracking / LR reference *', 'trackingReference'], ['Carrier / transporter', 'carrier'], ['Estimated arrival', 'estimatedArrivalAt']].map(([label, key]) => <div className="space-y-1.5" key={key}><Label>{label}</Label><Input type={key === 'estimatedArrivalAt' ? 'date' : 'text'} value={poOperationForm[key] || ''} onChange={e => setPoOperationForm({ ...poOperationForm, [key]: e.target.value })} /></div>)}</div>}
          {poOperation.operation === 'delay-follow-up' && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Reason / follow-up note *</Label><Input value={poOperationForm.reason || ''} onChange={e => setPoOperationForm({ ...poOperationForm, reason: e.target.value })} /></div><div className="space-y-1.5"><Label>Revised ETA</Label><Input type="date" value={poOperationForm.estimatedArrivalAt || ''} onChange={e => setPoOperationForm({ ...poOperationForm, estimatedArrivalAt: e.target.value })} /></div></div>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPoOperation(null)}>Cancel</Button><Button onClick={submitPoOperation}>{poOperation.operation === 'receive-goods' ? 'Create Gate Entry & GRN' : 'Save'}</Button></div></div>}</DialogContent>
      </Dialog>
    </div>
  );
}

function ProcurementDashboard({ meta, data, loading }: any) {
  const counts = data?.counts || {};
  const cards = [
    ['Material Requests', counts.materialRequests, '/procurement/material-requests'],
    ['RFQs', counts.rfqs, '/procurement/rfqs'],
    ['Supplier Quotes', counts.supplierQuotations, '/procurement/supplier-quotations'],
    ['Purchase Orders', counts.purchaseOrders, '/procurement/purchase-orders'],
    ['Receipts', counts.purchaseReceipts, '/procurement/purchase-receipts'],
    ['Invoices', counts.purchaseInvoices, '/procurement/purchase-invoices'],
    ['Payments', counts.supplierPayments, '/procurement/supplier-payments'],
  ];
  return (
    <div className="space-y-4">
      <PageHeader title={meta.title} description={meta.description} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className="rounded-md border border-[#e5e2dc] bg-white p-4 shadow-sm hover:bg-[#f8faf9] transition-colors"
          >
            <p className="text-xs font-medium uppercase text-[#7c8591]">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#1f2937]">{loading ? '...' : value || 0}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-md border border-[#e5e2dc] bg-white p-4">
        <p className="text-sm font-semibold text-[#1f2937]">Outstanding Payable</p>
        <p className="mt-2 text-3xl font-semibold text-[#c3423f]">
          {formatCurrency(Number(data?.outstandingPayable || 0))}
        </p>
      </div>
    </div>
  );
}

function BuyingSettings({ data, reload }: any) {
  const [form, setForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setForm(data || {}), [data]);

  async function save() {
    setIsSaving(true);
    try {
      await api.patch('/procurement/settings', form);
      showApiSuccess('Buying settings saved successfully');
      reload();
    } catch (err: any) {
      showApiError(err, 'Failed to save buying settings');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Buying Settings" description="Control buying tolerances and document requirements" />
      <div className="grid gap-4 rounded-md border border-[#e5e2dc] bg-white p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Default Currency</Label>
          <CurrencySelect
            value={form.defaultCurrency || 'INR'}
            onChange={(currency) => setForm({ ...form, defaultCurrency: currency })}
          />
        </div>
        <Field label="Over Receipt Allowance %">
          <Input
            type="number"
            value={form.overReceiptAllowancePercent || 0}
            onChange={(e) => setForm({ ...form, overReceiptAllowancePercent: Number(e.target.value) })}
          />
        </Field>
        <Field label="Over Billing Allowance %">
          <Input
            type="number"
            value={form.overBillingAllowancePercent || 0}
            onChange={(e) => setForm({ ...form, overBillingAllowancePercent: Number(e.target.value) })}
          />
        </Field>
        {[
          ['Rate Match Tolerance %', 'rateTolerancePercent'],
          ['Quantity Match Tolerance %', 'quantityTolerancePercent'],
          ['Tax Match Tolerance %', 'taxTolerancePercent'],
          ['MSME Payment Days', 'msmePaymentDays'],
        ].map(([label, key]) => (
          <Field key={key} label={label}>
            <Input type="number" value={form[key] ?? (key === 'msmePaymentDays' ? 45 : 0)} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
          </Field>
        ))}
        <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.requirePurchaseOrderForInvoice}
            onChange={(e) => setForm({ ...form, requirePurchaseOrderForInvoice: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span>PO required before invoice</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.requirePurchaseReceiptForInvoice}
            onChange={(e) => setForm({ ...form, requirePurchaseReceiptForInvoice: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span>Receipt required before invoice</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.autoCreateMaterialRequest}
            onChange={(e) => setForm({ ...form, autoCreateMaterialRequest: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span>Auto material request from reorder</span>
        </label>
        {[
          ['Require gate entry before GRN', 'requireGateEntry'],
          ['Require configured incoming inspections', 'requireInspectionForConfiguredItems'],
          ['Block posting until three-way match', 'requireThreeWayMatch'],
        ].map(([label, key]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
            <input type="checkbox" checked={form[key] !== false} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span>{label}</span>
          </label>
        ))}
        <div className="md:col-span-3">
          <Field label="Default RFQ Terms">
            <Input
              value={form.defaultRfqTerms || ''}
              placeholder="Standard payment in 30 days, FOB destination..."
              onChange={(e) => setForm({ ...form, defaultRfqTerms: e.target.value })}
            />
          </Field>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tracker({ rows, loading }: any) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const toggleRow = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = useMemo(() => {
    return (rows || []).filter((r: any) => {
      if (filterSupplier && !r.supplier?.toLowerCase().includes(filterSupplier.toLowerCase())) return false;
      if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterSupplier, filterStatus]);

  // Build flat pending items for export
  const pendingItems = useMemo(() => {
    const items: any[] = [];
    for (const row of filtered) {
      for (const item of (row.items || [])) {
        if (item.pending > 0) {
          items.push({
            poNo: row.orderNo,
            supplier: row.supplier,
            poStatus: row.status,
            product: item.product,
            sku: item.sku || '',
            ordered: item.ordered,
            received: item.received,
            pending: item.pending,
            uom: item.uom || '',
          });
        }
      }
    }
    return items;
  }, [filtered]);

  function exportToExcel() {
    if (!pendingItems.length) { toast.error('No pending items to export'); return; }
    const headers = ['PO #', 'Supplier', 'PO Status', 'Product', 'SKU', 'Ordered', 'Received', 'Pending', 'UOM'];
    const csvRows = [headers.join(',')];
    for (const item of pendingItems) {
      csvRows.push([
        item.poNo, `"${item.supplier}"`, item.poStatus, `"${item.product}"`, item.sku,
        item.ordered, item.received, item.pending, item.uom
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pending_material_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${pendingItems.length} pending items`);
  }

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows || []) set.add(r.status);
    return Array.from(set).sort();
  }, [rows]);

  const totalPending = pendingItems.reduce((s: number, i: any) => s + i.pending, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Consolidated Pending Material</h1>
          <p className="mt-1 text-sm text-gray-500">Bird's-eye view of all POs with pending material — filter, drill down, and export to Excel</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2" disabled={!pendingItems.length}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export to Excel ({pendingItems.length} items)
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-[#e5e2dc] bg-white p-4">
          <p className="text-xs text-gray-500">Total Open POs</p>
          <p className="mt-1 text-xl font-semibold">{filtered.length}</p>
        </div>
        <div className="rounded-md border border-[#e5e2dc] bg-white p-4">
          <p className="text-xs text-gray-500">POs with Pending Material</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{filtered.filter((r: any) => (r.items || []).some((i: any) => i.pending > 0)).length}</p>
        </div>
        <div className="rounded-md border border-[#e5e2dc] bg-white p-4">
          <p className="text-xs text-gray-500">Pending Line Items</p>
          <p className="mt-1 text-xl font-semibold text-red-600">{pendingItems.length}</p>
        </div>
        <div className="rounded-md border border-[#e5e2dc] bg-white p-4">
          <p className="text-xs text-gray-500">Total Pending Qty</p>
          <p className="mt-1 text-xl font-semibold">{totalPending.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Filter by supplier..." value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="max-w-xs" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-md border border-[#e5e2dc] px-3 py-2 text-sm">
          <option value="ALL">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-md border border-[#e5e2dc] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received %</th>
              <th className="px-4 py-3">Billed %</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pending Items</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>}
            {filtered.map((row: any) => {
              const pendingCount = (row.items || []).filter((i: any) => i.pending > 0).length;
              const isExpanded = expandedRows[row.id];
              return (
                <>
                  <tr key={row.id} className={`border-t border-[#e5e2dc] cursor-pointer hover:bg-gray-50/60 ${pendingCount > 0 ? '' : 'opacity-60'}`} onClick={() => toggleRow(row.id)}>
                    <td className="px-4 py-3 text-gray-400">{pendingCount > 0 ? (isExpanded ? '▼' : '▶') : '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/procurement/purchase-orders/${row.id}`} className="font-mono text-xs font-semibold text-[#1674c4] hover:underline" onClick={e => e.stopPropagation()}>
                        {row.orderNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.supplier}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">{Number(row.receivedPercent || 0).toFixed(0)}%</td>
                    <td className="px-4 py-3">{Number(row.billedPercent || 0).toFixed(0)}%</td>
                    <td className="px-4 py-3">{formatCurrency(Number(row.total || 0))}</td>
                    <td className="px-4 py-3">
                      {pendingCount > 0 ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{pendingCount} pending</span> : <span className="text-xs text-emerald-600">✓ All received</span>}
                    </td>
                  </tr>
                  {isExpanded && pendingCount > 0 && (
                    <tr key={`${row.id}-items`} className="border-t border-[#e5e2dc] bg-gray-50/40">
                      <td colSpan={8} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-left text-gray-500 uppercase">
                            <tr><th className="px-3 py-1.5">Product</th><th className="px-3 py-1.5">SKU</th><th className="px-3 py-1.5">Ordered</th><th className="px-3 py-1.5">Received</th><th className="px-3 py-1.5">Pending</th><th className="px-3 py-1.5">UOM</th></tr>
                          </thead>
                          <tbody>
                            {(row.items || []).filter((i: any) => i.pending > 0).map((item: any, idx: number) => (
                              <tr key={idx} className="border-t border-[#e5e2dc]">
                                <td className="px-3 py-1.5 font-medium">{item.product}</td>
                                <td className="px-3 py-1.5 text-gray-500">{item.sku || '—'}</td>
                                <td className="px-3 py-1.5">{item.ordered}</td>
                                <td className="px-3 py-1.5 text-emerald-700">{item.received}</td>
                                <td className="px-3 py-1.5 font-semibold text-red-600">{item.pending}</td>
                                <td className="px-3 py-1.5">{item.uom || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function DocumentFields({ kind, form, setForm, suppliers, products, orders, receipts, invoices, warehouses, setLines }: any) {
  return (
    <div className="grid gap-3 rounded-md border border-[#e5e2dc] bg-[#fbfaf8] p-3 md:grid-cols-4">
      {usesSupplier(kind) && (
        <div className="space-y-1.5">
          <Label>Supplier *</Label>
          <Select
            value={form.supplierId || ''}
            onValueChange={(v) => setForm({ ...form, supplierId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.length === 0 ? (
                <SelectEmptyState
                  message="No suppliers found"
                  linkHref="/suppliers"
                  linkText="Create Supplier"
                />
              ) : (
                suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {kind === 'supplier-quotations' && <>
        {[
          ['AO Number', 'aoNo'], ['Accepted Order Number', 'acceptedOrderNo'], ['Accepted Order Date', 'acceptedOrderDate'], ['Vendor Order Number', 'vendorOrderNo'],
          ['Bill-to Code', 'billToCode'], ['Bill-to Name', 'billToName'], ['Bill-to GSTIN', 'billToGstin'], ['Bill-to PAN', 'billToPan'],
          ['Dispatch-to Code', 'dispatchToCode'], ['Dispatch-to Name', 'dispatchToName'], ['Dispatch-to GSTIN', 'dispatchToGstin'], ['Vendor Code', 'vendorCode'],
          ['Contact Person', 'contactPerson'], ['Contact Number', 'contactNo'], ['Payment Terms', 'paymentTerms'], ['Documents To', 'documentsTo'],
        ].map(([label, key]) => <Field label={label} key={key}><Input value={form.vendorDocumentDetails?.[key] || ''} onChange={(e: any) => setForm({ ...form, vendorDocumentDetails: { ...(form.vendorDocumentDetails || {}), [key]: e.target.value } })} /></Field>)}
        <div className="space-y-1.5 md:col-span-2"><Label>Bill-to Address</Label><Textarea value={form.vendorDocumentDetails?.billToAddress || ''} onChange={(e: any) => setForm({ ...form, vendorDocumentDetails: { ...(form.vendorDocumentDetails || {}), billToAddress: e.target.value } })} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Dispatch-to Address</Label><Textarea value={form.vendorDocumentDetails?.dispatchToAddress || ''} onChange={(e: any) => setForm({ ...form, vendorDocumentDetails: { ...(form.vendorDocumentDetails || {}), dispatchToAddress: e.target.value } })} /></div>
      </>}
      {kind === 'payment-terms' && (
        <>
          <Field label="Template Name *">
            <Input
              required
              placeholder="e.g. 30-60-10 Milestone Plan"
              value={form.name || ''}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <Input
              placeholder="Schedule details"
              value={form.description || ''}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </>
      )}
      {kind === 'supplier-items' && (
        <>
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <Select
              value={form.supplierId || ''}
              onValueChange={(v) => setForm({ ...form, supplierId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent searchable searchPlaceholder="Search products…">
                {suppliers.length === 0 ? (
                  <SelectEmptyState
                    message="No suppliers found"
                    linkHref="/suppliers"
                    linkText="Create Supplier"
                  />
                ) : (
                  suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item *</Label>
            <Select
              value={form.productId || ''}
              onValueChange={(v) => setForm({ ...form, productId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent searchable searchPlaceholder="Search products…">
                {products.length === 0 ? (
                  <SelectEmptyState
                    message="No products found"
                    linkHref="/inventory/products"
                    linkText="Create Product"
                  />
                ) : (
                  products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Field label="Supplier Item Code *">
            <Input
              required
              placeholder="e.g. SUP-SKU-990"
              value={form.supplierItemCode || ''}
              onChange={(e: any) => setForm({ ...form, supplierItemCode: e.target.value })}
            />
          </Field>
          <Field label="Supplier Item Name">
            <Input
              placeholder="e.g. OEM Heavy Fastener"
              value={form.supplierItemName || ''}
              onChange={(e: any) => setForm({ ...form, supplierItemName: e.target.value })}
            />
          </Field>
        </>
      )}
      {kind === 'communications' && (
        <>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select
              value={form.supplierId || ''}
              onValueChange={(v) => setForm({ ...form, supplierId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <SelectEmptyState
                    message="No suppliers found"
                    linkHref="/suppliers"
                    linkText="Create Supplier"
                  />
                ) : (
                  suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select
              value={form.channel || 'EMAIL'}
              onValueChange={(v) => setForm({ ...form, channel: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['EMAIL', 'PHONE', 'PORTAL', 'NOTE'].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Subject">
            <Input
              placeholder="e.g. RFQ Follow-up"
              value={form.subject || ''}
              onChange={(e: any) => setForm({ ...form, subject: e.target.value })}
            />
          </Field>
          <Field label="Message *">
            <Input
              required
              placeholder="Communication summary..."
              value={form.message || ''}
              onChange={(e: any) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
        </>
      )}
      {kind === 'purchase-receipts' && (
        <>
          <div className="space-y-1.5">
            <Label>From Purchase Order</Label>
            <Select
              value={form.purchaseOrderId || ''}
              onValueChange={(v) => {
              setForm({ ...form, purchaseOrderId: v, supplierId: orders.find((o: any) => o.id === v)?.supplierId });
              const po = orders.find((o: any) => o.id === v);
              if (po?.items?.length) {
                setLines(po.items.map((item: any) => ({
                  purchaseOrderItemId: item.id,
                  productId: item.productId,
                  quantity: Number(item.quantity) - Number(item.acceptedQty || 0),
                  unitPrice: Number(item.unitPrice || 0),
                  rate: Number(item.unitPrice || 0),
                  batchNo: '',
                  supplierBatchNo: '',
                  discount: 0,
                  taxRate: 0,
                })));
              }
            }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Manual receipt or select PO" />
              </SelectTrigger>
              <SelectContent>
                {orders.length === 0 ? (
                  <SelectEmptyState
                    message="No purchase orders found"
                    linkHref="/procurement/purchase-orders"
                    linkText="Create Purchase Order"
                  />
                ) : (
                  orders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNo} - {o.supplier?.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Receiving Warehouse *</Label>
            <Select
              value={form.warehouseId || ''}
              onValueChange={(v) => setForm({ ...form, warehouseId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select receiving warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.length === 0 ? (
                  <SelectEmptyState
                    message="No warehouses found"
                    linkHref="/inventory/warehouses"
                    linkText="Create Warehouse"
                  />
                ) : (
                  warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.code ? `(${w.code})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {kind === 'purchase-invoices' && (
        <>
          <div className="space-y-1.5">
            <Label>Purchase Order</Label>
            <Select
              value={form.purchaseOrderId || ''}
              onValueChange={(v) => setForm({ ...form, purchaseOrderId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No PO or select PO" />
              </SelectTrigger>
              <SelectContent>
                {orders.length === 0 ? (
                  <SelectEmptyState
                    message="No purchase orders found"
                    linkHref="/procurement/purchase-orders"
                    linkText="Create Purchase Order"
                  />
                ) : (
                  orders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purchase Receipt</Label>
            <Select
              value={form.purchaseReceiptId || ''}
              onValueChange={(v) => setForm({ ...form, purchaseReceiptId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No receipt or select receipt" />
              </SelectTrigger>
              <SelectContent>
                {receipts.length === 0 ? (
                  <SelectEmptyState
                    message="No purchase receipts found"
                    linkHref="/procurement/purchase-receipts"
                    linkText="Create Purchase Receipt"
                  />
                ) : (
                  receipts.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.receiptNo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {kind === 'supplier-payments' && (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Purchase Invoice</Label>
            <Select
              value={form.purchaseInvoiceId || ''}
              onValueChange={(v) => {
                const invoice = invoices.find((item: any) => item.id === v);
                setForm({
                  ...form,
                  purchaseInvoiceId: v,
                  supplierId: invoice?.supplierId || form.supplierId,
                  amount: invoice ? Number(invoice.outstandingAmount || 0) : form.amount,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.type === 'ADVANCE' ? 'Advance / unallocated' : 'Select invoice'} />
              </SelectTrigger>
              <SelectContent>
                {invoices.length === 0 ? (
                  <SelectEmptyState
                    message="No unpaid invoices found"
                    linkHref="/procurement/purchase-invoices"
                    linkText="Create Purchase Invoice"
                  />
                ) : (
                  invoices
                    .filter(
                      (i: any) =>
                        !['PAID', 'CANCELLED'].includes(i.status) &&
                        (!form.supplierId || i.supplierId === form.supplierId)
                    )
                    .map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoiceNo} — {i.supplier?.name || 'Supplier'} —{' '}
                        {formatCurrency(Number(i.outstandingAmount || 0), i.currency)}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type || 'INVOICE_PAYMENT'}
              onValueChange={(v) =>
                setForm({ ...form, type: v, purchaseInvoiceId: v === 'ADVANCE' ? '' : form.purchaseInvoiceId })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVOICE_PAYMENT">INVOICE_PAYMENT</SelectItem>
                <SelectItem value="ADVANCE">ADVANCE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {kind === 'landed-cost-vouchers' && (
        <>
          <div className="space-y-1.5">
            <Label>Purchase Receipt *</Label>
            <Select
              value={form.purchaseReceiptId || ''}
              onValueChange={(v) => setForm({ ...form, purchaseReceiptId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select receipt" />
              </SelectTrigger>
              <SelectContent>
                {receipts.length === 0 ? (
                  <SelectEmptyState
                    message="No purchase receipts found"
                    linkHref="/procurement/purchase-receipts"
                    linkText="Create Purchase Receipt"
                  />
                ) : (
                  receipts.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.receiptNo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Allocation Basis</Label>
            <Select
              value={form.allocationBasis || 'VALUE'}
              onValueChange={(v) => setForm({ ...form, allocationBasis: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VALUE">VALUE</SelectItem>
                <SelectItem value="QUANTITY">QUANTITY</SelectItem>
                <SelectItem value="WEIGHT">WEIGHT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {kind === 'quality-inspections' && (
        <>
          <div className="space-y-1.5">
            <Label>Purchase Receipt</Label>
            <Select
              value={form.purchaseReceiptId || ''}
              onValueChange={(v) => setForm({ ...form, purchaseReceiptId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select receipt" />
              </SelectTrigger>
              <SelectContent>
                {receipts.length === 0 ? (
                  <SelectEmptyState
                    message="No purchase receipts found"
                    linkHref="/procurement/purchase-receipts"
                    linkText="Create Purchase Receipt"
                  />
                ) : (
                  receipts.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.receiptNo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Field label="Inspected Qty">
            <Input
              type="number"
              value={form.inspectedQty || 0}
              onChange={(e: any) => setForm({ ...form, inspectedQty: Number(e.target.value) })}
            />
          </Field>
          <Field label="Accepted Qty">
            <Input
              type="number"
              value={form.acceptedQty || 0}
              onChange={(e: any) => setForm({ ...form, acceptedQty: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rejected Qty">
            <Input
              type="number"
              value={form.rejectedQty || 0}
              onChange={(e: any) => setForm({ ...form, rejectedQty: Number(e.target.value) })}
            />
          </Field>
        </>
      )}
      {dateField(kind) && (
        <Field label={dateField(kind) || 'Date'}>
          <Input
            type="date"
            value={form.date || form.requiredBy || form.validFrom || form.postingDate || today()}
            onChange={(e: any) => setForm({ ...form, [dateKey(kind)]: e.target.value })}
          />
        </Field>
      )}
      {kind === 'purchase-orders' && (
        <Field label="Expected Delivery Date">
          <Input type="date" value={form.expectedDate || ''} onChange={(e: any) => setForm({ ...form, expectedDate: e.target.value })} />
        </Field>
      )}
      {kind === 'blanket-purchase-orders' && (
        <Field label="Valid To">
          <Input
            type="date"
            value={form.validTo || today()}
            onChange={(e: any) => setForm({ ...form, validTo: e.target.value })}
          />
        </Field>
      )}
      {['purchase-orders', 'purchase-invoices', 'supplier-quotations', 'blanket-purchase-orders'].includes(kind) && (
        <>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <CurrencySelect
              value={form.currency || 'INR'}
              onChange={(currency) => setForm({ ...form, currency })}
            />
          </div>
          <Field label="Exchange Rate">
            <Input
              type="number"
              value={form.exchangeRate || 1}
              onChange={(e: any) => setForm({ ...form, exchangeRate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Shipping / Freight">
            <Input
              type="number"
              value={form.shippingAmount || 0}
              onChange={(e: any) => setForm({ ...form, shippingAmount: Number(e.target.value) })}
            />
          </Field>
        </>
      )}
      {kind === 'supplier-payments' && (
        <>
          <Field label="Amount *">
            <Input
              type="number"
              required
              value={form.amount || 0}
              onChange={(e: any) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Reference">
            <Input
              placeholder="UTR / Bank Ref / Cheque No"
              value={form.reference || ''}
              onChange={(e: any) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
        </>
      )}
      <div className="md:col-span-4">
        <Field label="Notes / Terms">
          <Input
            placeholder="Special delivery instructions, vendor notes, or terms"
            value={form.notes || form.terms || ''}
            onChange={(e: any) => setForm({ ...form, notes: e.target.value, terms: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function PaymentTermEditor({ lines, setLines }: any) {
  const rows = lines.length ? lines : [{ label: 'Advance', percentage: 30, dueAfterDays: 0 }];
  return (
    <div className="space-y-2 rounded-md border border-[#e5e2dc] bg-white p-3">
      <div className="flex items-center justify-between">
        <Label>Schedule</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines([...rows, { label: '', percentage: 0, dueAfterDays: 0 }])}
        >
          Add Term
        </Button>
      </div>
      {rows.map((line: any, index: number) => (
        <div key={index} className="grid grid-cols-12 gap-2">
          <Input
            className="col-span-5 h-8"
            placeholder="Milestone (e.g. On Delivery)"
            value={line.label || ''}
            onChange={(e) => updateLine(rows, setLines, index, { label: e.target.value })}
          />
          <Input
            className="col-span-3 h-8"
            type="number"
            placeholder="%"
            value={line.percentage || 0}
            onChange={(e) => updateLine(rows, setLines, index, { percentage: Number(e.target.value) })}
          />
          <Input
            className="col-span-3 h-8"
            type="number"
            placeholder="Due days"
            value={line.dueAfterDays || 0}
            onChange={(e) => updateLine(rows, setLines, index, { dueAfterDays: Number(e.target.value) })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-1"
            onClick={() => setLines(rows.filter((_: any, i: number) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

function LineEditor({ kind, lines, setLines, products, total, currency }: any) {
  return (
    <div className="space-y-3 rounded-md border border-[#e5e2dc] bg-white p-3">
      <div className="flex items-center justify-between">
        <div><Label>Items</Label><p className="mt-0.5 text-xs text-gray-500">Select a product and enter its commercial details.</p></div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, blankLine])}>
          Add Row
        </Button>
      </div>
      {lines.map((line: any, index: number) => (
        <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 md:grid-cols-12 md:items-end">
          <div className="space-y-1 md:col-span-4">
            <Label className="text-xs">Product / Item *</Label>
            <Select
              value={line.productId}
              onValueChange={(v) => {
                const product = products.find((p: any) => p.id === v);
                updateLine(lines, setLines, index, {
                  productId: v,
                  unitPrice: Number(product?.costPrice || 0),
                  rate: Number(product?.costPrice || 0),
                });
              }}
            >
              <SelectTrigger className="h-9 bg-white text-xs">
                <SelectValue placeholder="Search and select item" />
              </SelectTrigger>
              <SelectContent searchable searchPlaceholder="Search products…">
                {products.length === 0 ? (
                  <SelectEmptyState
                    message="No products found"
                    linkHref="/inventory/products"
                    linkText="Create Product"
                  />
                ) : (
                  products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2"><Label className="text-xs">Quantity *</Label><Input aria-label="Quantity" className="h-9 bg-white" type="number" min="0" step="any" placeholder="0" value={line.quantity} onChange={(e) => updateLine(lines, setLines, index, { quantity: Number(e.target.value) })} /></div>
          <div className="space-y-1 md:col-span-2"><Label className="text-xs">Rate ({currency || 'INR'}) *</Label><Input aria-label={`Rate in ${currency || 'INR'}`} className="h-9 bg-white" type="number" min="0" step="any" placeholder="0.00" value={line.unitPrice || line.rate || 0} onChange={(e) => updateLine(lines, setLines, index, { unitPrice: Number(e.target.value), rate: Number(e.target.value) })} /></div>
          <div className="space-y-1 md:col-span-1"><Label className="text-xs">Discount %</Label><Input aria-label="Discount percentage" className="h-9 bg-white" type="number" min="0" max="100" step="any" placeholder="0" value={line.discount || 0} onChange={(e) => updateLine(lines, setLines, index, { discount: Number(e.target.value) })} /></div>
          <div className="space-y-1 md:col-span-1"><Label className="text-xs">Tax %</Label><Input aria-label="Tax percentage" className="h-9 bg-white" type="number" min="0" step="any" placeholder="0" value={line.taxRate || 0} onChange={(e) => updateLine(lines, setLines, index, { taxRate: Number(e.target.value) })} /></div>
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs">Line amount</Label>
            <div className="flex h-9 items-center justify-end rounded-md border bg-white px-2 text-xs font-semibold text-gray-800" title="Quantity × rate before document-level charges">
              {formatCurrency(Number(line.quantity || 0) * Number(line.unitPrice || line.rate || 0) * (1 - Number(line.discount || 0) / 100) * (1 + Number(line.taxRate || 0) / 100), currency)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove item row ${index + 1}`}
            title="Remove item"
            className="h-9 text-red-600 hover:bg-red-50 hover:text-red-700 md:col-span-1"
            onClick={() => setLines(lines.filter((_: any, i: number) => i !== index))}
          >
            Remove
          </Button>
          {kind === 'purchase-receipts' && <div className="grid gap-3 border-t pt-3 md:col-span-12 sm:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Internal Batch No {products.find((p: any) => p.id === line.productId)?.hasBatchNo ? '*' : ''}</Label><Input aria-label="Batch number" className="h-8 bg-white" placeholder="e.g. BATCH-001" value={line.batchNo || ''} onChange={(e: any) => updateLine(lines, setLines, index, { batchNo: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Supplier Batch</Label><Input aria-label="Supplier batch" className="h-8 bg-white" placeholder="Optional" value={line.supplierBatchNo || ''} onChange={(e: any) => updateLine(lines, setLines, index, { supplierBatchNo: e.target.value })} /></div>
          </div>}
          {kind === 'supplier-quotations' && <div className="grid gap-3 border-t pt-3 md:col-span-12 sm:grid-cols-2 lg:grid-cols-6">
            {[['Category / CAT', 'categoryCode'], ['HSN Code', 'hsnCode'], ['Make / Brand', 'make'], ['Quantity tolerance', 'quantityTolerance'], ['Delivery date', 'deliveryDate'], ['UOM', 'uom']].map(([label, key]) => <div className="space-y-1" key={key}><Label className="text-xs">{label}</Label><Input aria-label={label} type={key === 'deliveryDate' ? 'date' : 'text'} className="h-9 bg-white" placeholder={key === 'quantityTolerance' ? 'e.g. ±5%' : `Enter ${label.toLowerCase()}`} value={line[key] || ''} onChange={(e) => updateLine(lines, setLines, index, { [key]: e.target.value })} /></div>)}
          </div>}
        </div>
      ))}
      <div className="flex justify-end border-t pt-3 text-sm font-semibold text-gray-900">
        <span className="rounded-md bg-gray-100 px-3 py-2">Preview subtotal: {formatCurrency(total, currency)}</span>
      </div>
      {kind === 'purchase-receipts' && (
        <p className="text-xs text-[#7c8591]">
          For receipts, quantity is treated as received and accepted quantity unless a quality inspection later
          changes it.
        </p>
      )}
    </div>
  );
}

function ChargeEditor({ lines, setLines }: any) {
  return (
    <div className="space-y-2 rounded-md border border-[#e5e2dc] bg-white p-3">
      <div className="flex items-center justify-between">
        <Label>Landed Charges</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines([...lines, { type: 'FREIGHT', amount: 0, description: '' }])}
        >
          Add Charge
        </Button>
      </div>
      {lines.map((line: any, index: number) => (
        <div key={index} className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <Select
              value={line.type || 'FREIGHT'}
              onValueChange={(v) => updateLine(lines, setLines, index, { type: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREIGHT">FREIGHT</SelectItem>
                <SelectItem value="CUSTOMS">CUSTOMS</SelectItem>
                <SelectItem value="INSURANCE">INSURANCE</SelectItem>
                <SelectItem value="HANDLING">HANDLING</SelectItem>
                <SelectItem value="OTHER">OTHER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            className="col-span-6 h-8"
            placeholder="Charge description"
            value={line.description || ''}
            onChange={(e) => updateLine(lines, setLines, index, { description: e.target.value })}
          />
          <Input
            className="col-span-2 h-8"
            type="number"
            placeholder="Amount"
            value={line.amount || 0}
            onChange={(e) => updateLine(lines, setLines, index, { amount: Number(e.target.value) })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-1"
            onClick={() => setLines(lines.filter((_: any, i: number) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function updateLine(lines: any[], setLines: any, index: number, patch: any) {
  const next = [...lines];
  next[index] = { ...next[index], ...patch };
  setLines(next);
}

function defaultForm(kind: ProcurementKind) {
  const base: any = { date: today(), currency: 'INR', exchangeRate: 1 };
  if (kind === 'material-requests') return { requiredBy: today(), source: 'MANUAL' };
  if (kind === 'rfqs') return { validUntil: today() };
  if (kind === 'supplier-quotations') return { ...base, vendorDocumentDetails: {} };
  if (kind === 'blanket-purchase-orders') return { validFrom: today(), validTo: today(), currency: 'INR' };
  if (kind === 'purchase-receipts') return { postingDate: today() };
  if (kind === 'supplier-payments')
    return { date: today(), type: 'INVOICE_PAYMENT', method: 'BANK_TRANSFER', amount: 0 };
  if (kind === 'communications') return { channel: 'EMAIL', direction: 'OUTBOUND', message: '' };
  return base;
}

function payloadFor(kind: ProcurementKind, form: any, lines: any[]) {
  if (kind === 'landed-cost-vouchers')
    return { ...form, charges: lines.filter((line) => Number(line.amount || 0) > 0) };
  if (kind === 'payment-terms')
    return {
      ...form,
      terms: lines.filter((line) => line.label).map((line, index) => ({ ...line, rowOrder: index })),
    };
  if (
    kind === 'supplier-payments' ||
    kind === 'quality-inspections' ||
    kind === 'supplier-items' ||
    kind === 'communications'
  )
    return form;
  if (kind === 'purchase-receipts')
    return form.purchaseOrderId
      ? { ...form, warehouseId: form.warehouseId, items: lines.filter((l: any) => l.productId).map((line: any) => ({ ...line, warehouseId: form.warehouseId, receivedQty: line.quantity, acceptedQty: line.quantity, rate: line.unitPrice || line.rate })) }
      : {
        ...form,
        supplierId: form.supplierId,
        warehouseId: form.warehouseId,
        items: lines.filter((l: any) => l.productId).map((line) => ({
          ...line,
          warehouseId: form.warehouseId,
          receivedQty: line.quantity,
          acceptedQty: line.quantity,
          rate: line.unitPrice || line.rate,
        })),
      };
  if (kind === 'supplier-quotations')
    return { ...form, items: lines.map((line) => ({ ...line, rate: line.unitPrice || line.rate })) };
  return { ...form, items: lines };
}

function columnsFor(kind: ProcurementKind, status: (id: string, value: string) => void, operate: (row: any, operation: string) => void, rfqOperation: (row: any, operation: string) => void) {
  const actions = (row: any) => <Actions kind={kind} row={row} status={status} operate={operate} rfqOperation={rfqOperation} />;
  if (kind === 'material-requests')
    return [
      { key: 'requestNo', header: 'Request #' },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'requiredBy', header: 'Required By', render: (r: any) => (r.requiredBy ? formatDate(r.requiredBy) : '-') },
      { key: 'items', header: 'Items', render: (r: any) => r.items?.length || 0 },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'rfqs')
    return [
      { key: 'rfqNo', header: 'Procurement Case', render: (r: any) => <Link href={`/procurement/rfqs/${r.id}`} className="font-mono font-semibold text-blue-600 hover:underline">{r.rfqNo}</Link> },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'validUntil', header: 'Valid Until', render: (r: any) => (r.validUntil ? formatDate(r.validUntil) : '-') },
      { key: 'suppliers', header: 'Suppliers', render: (r: any) => r.suppliers?.length || 0 },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'supplier-quotations')
    return [
      { key: 'quotationNo', header: 'Quote #' },
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'total', header: 'Total', render: (r: any) => formatCurrency(Number(r.total || 0), r.currency) },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'purchase-orders')
    return [
      {
        key: 'orderNo',
        header: 'PO #',
        render: (r: any) => <Link href={`/procurement/purchase-orders/${r.id}`} className="font-mono text-xs font-semibold text-[#1674c4] hover:underline">{r.orderNo}</Link>,
      },
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      {
        key: 'receivedPercent',
        header: 'Received',
        render: (r: any) => `${Number(r.receivedPercent || 0).toFixed(0)}%`,
      },
      { key: 'trackingReference', header: 'GIT / Tracking', render: (r: any) => r.trackingReference || '—' },
      { key: 'estimatedArrivalAt', header: 'ETA', render: (r: any) => r.estimatedArrivalAt ? formatDate(r.estimatedArrivalAt) : '—' },
      { key: 'total', header: 'Total', render: (r: any) => formatCurrency(Number(r.total || 0), r.currency) },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'purchase-receipts')
    return [
      { key: 'receiptNo', header: 'Receipt #' },
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'acceptedQty', header: 'Accepted' },
      {
        key: 'landedCostAmount',
        header: 'Landed Cost',
        render: (r: any) => formatCurrency(Number(r.landedCostAmount || 0), r.currency),
      },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'purchase-invoices')
    return [
      { key: 'invoiceNo', header: 'Invoice #' },
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'total', header: 'Total', render: (r: any) => formatCurrency(Number(r.total || 0), r.currency) },
      {
        key: 'outstandingAmount',
        header: 'Outstanding',
        render: (r: any) => formatCurrency(Number(r.outstandingAmount || 0), r.currency),
      },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'supplier-payments')
    return [
      { key: 'paymentNo', header: 'Payment #' },
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'type', header: 'Type' },
      { key: 'amount', header: 'Amount', render: (r: any) => formatCurrency(Number(r.amount || 0), r.currency) },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'payment-terms')
    return [
      { key: 'name', header: 'Template' },
      { key: 'description', header: 'Description' },
      { key: 'terms', header: 'Terms', render: (r: any) => r.terms?.length || 0 },
      { key: 'isActive', header: 'Active', render: (r: any) => (r.isActive ? 'Yes' : 'No') },
    ];
  if (kind === 'supplier-items')
    return [
      { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
      { key: 'product', header: 'Item', render: (r: any) => r.product?.name },
      { key: 'supplierItemCode', header: 'Supplier Code' },
      { key: 'supplierItemName', header: 'Supplier Name' },
      { key: 'leadTimeDays', header: 'Lead Time' },
    ];
  if (kind === 'communications')
    return [
      { key: 'sentAt', header: 'Date', render: (r: any) => formatDate(r.sentAt) },
      { key: 'channel', header: 'Channel' },
      { key: 'subject', header: 'Subject' },
      { key: 'message', header: 'Message' },
      { key: 'direction', header: 'Direction' },
    ];
  if (kind === 'landed-cost-vouchers')
    return [
      { key: 'voucherNo', header: 'Voucher #' },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'allocationBasis', header: 'Basis' },
      { key: 'totalCharges', header: 'Charges', render: (r: any) => formatCurrency(Number(r.totalCharges || 0)) },
      { key: 'actions', header: '', render: actions },
    ];
  if (kind === 'quality-inspections')
    return [
      { key: 'inspectionNo', header: 'Inspection #' },
      { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'inspectedQty', header: 'Inspected' },
      { key: 'acceptedQty', header: 'Accepted' },
      { key: 'rejectedQty', header: 'Rejected' },
    ];
  return [
    { key: 'agreementNo', header: 'Agreement #' },
    { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier?.name },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'validFrom', header: 'Valid From', render: (r: any) => formatDate(r.validFrom) },
    { key: 'validTo', header: 'Valid To', render: (r: any) => formatDate(r.validTo) },
  ];
}

function Actions({ kind, row, status, operate, rfqOperation }: any) {
  if (['material-requests', 'purchase-receipts', 'landed-cost-vouchers'].includes(kind) && row.status === 'DRAFT')
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          status(row.id, 'SUBMITTED');
        }}
      >
        Submit
      </Button>
    );
  if (kind === 'purchase-orders') return <div className="flex flex-wrap justify-end gap-1">
    <Button size="sm" variant="outline" asChild><Link href={`/procurement/purchase-orders/${row.id}`} onClick={(e) => e.stopPropagation()}>Open workspace</Link></Button>
    {row.status === 'DRAFT' && !row.submittedAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); operate(row, 'submit'); }}>Submit</Button>}
    {row.status === 'DRAFT' && row.approvalInstanceId && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); operate(row, 'approve'); }}>Finalize Approval</Button>}
    {row.status === 'CONFIRMED' && !row.sentAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); operate(row, 'send'); }}>Email Vendor</Button>}
    {['SENT', 'CONFIRMED', 'RECEIVING'].includes(row.status) && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); operate(row, 'dispatch'); }}>Record GIT</Button>}
    {['SENT', 'CONFIRMED', 'RECEIVING'].includes(row.status) && <Button size="sm" variant="outline" asChild><Link href={`/procurement/purchase-orders/${row.id}`} onClick={(e) => e.stopPropagation()}>Receive partial</Link></Button>}
    {['SENT', 'CONFIRMED', 'RECEIVING'].includes(row.status) && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); operate(row, 'delay-follow-up'); }}>Delay Follow-up</Button>}
  </div>;
  if (kind === 'purchase-invoices' && row.status === 'DRAFT')
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          status(row.id, 'SUBMITTED');
        }}
      >
        Submit
      </Button>
    );
  if (kind === 'supplier-payments' && row.status === 'DRAFT')
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          status(row.id, 'SUBMITTED');
        }}
      >
        Submit
      </Button>
    );
  if (kind === 'rfqs' && row.status === 'DRAFT') return <div className="flex gap-1">
    {!row.submittedAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); rfqOperation(row, 'submit'); }}>Submit</Button>}
    {row.submittedAt && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); rfqOperation(row, 'send'); }}>Email Vendors</Button>}
  </div>;
  return <span className="text-xs text-[#8a929d]">-</span>;
}

function statusPath(kind: ProcurementKind, id: string) {
  const map: Record<string, string> = {
    'material-requests': `/procurement/material-requests/${id}/status`,
    rfqs: `/procurement/rfqs/${id}/status`,
    'purchase-orders': `/procurement/purchase-orders/${id}/status`,
    'purchase-receipts': `/procurement/purchase-receipts/${id}/status`,
    'landed-cost-vouchers': `/procurement/landed-cost-vouchers/${id}/status`,
    'purchase-invoices': `/procurement/purchase-invoices/${id}/status`,
    'supplier-payments': `/procurement/supplier-payments/${id}/status`,
  };
  return map[kind];
}

function needsLines(kind: ProcurementKind) {
  return [
    'material-requests',
    'rfqs',
    'supplier-quotations',
    'blanket-purchase-orders',
    'purchase-orders',
    'purchase-receipts',
    'purchase-invoices',
  ].includes(kind);
}

function usesSupplier(kind: ProcurementKind) {
  return [
    'supplier-quotations',
    'blanket-purchase-orders',
    'purchase-orders',
    'purchase-receipts',
    'purchase-invoices',
    'supplier-payments',
  ].includes(kind);
}

function dateField(kind: ProcurementKind) {
  if (kind === 'material-requests') return 'Required By';
  if (kind === 'blanket-purchase-orders') return 'Valid From';
  if (kind === 'purchase-receipts') return 'Posting Date';
  if (kind === 'supplier-payments') return 'Payment Date';
  return ['purchase-orders', 'purchase-invoices', 'supplier-quotations'].includes(kind) ? 'Date' : null;
}

function dateKey(kind: ProcurementKind) {
  if (kind === 'material-requests') return 'requiredBy';
  if (kind === 'blanket-purchase-orders') return 'validFrom';
  if (kind === 'purchase-receipts') return 'postingDate';
  return 'date';
}

function singular(title: string) {
  return title.replace(/ies$/, 'y').replace(/s$/, '');
}
