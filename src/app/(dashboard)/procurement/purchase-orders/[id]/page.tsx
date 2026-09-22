'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, IndianRupee, Mail, PackageCheck, RefreshCw, Truck, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';

const qty = (value: any) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const formatCurrency = (value: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const unwrap = (response: any) => response.data?.data ?? response.data;

export default function PurchaseOrderWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workspace, setWorkspace] = useState<any>();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [rejectedWarehouseId, setRejectedWarehouseId] = useState('');
  const [receiptLines, setReceiptLines] = useState<Record<string, any>>({});
  const [posting, setPosting] = useState(false);
  const [communication, setCommunication] = useState({ target: 'SUPPLIER', salesOrderId: '', recipient: '', subject: '', message: '' });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<any>({});
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);
  const [invoiceViewOpen, setInvoiceViewOpen] = useState(false);
  const [invoiceViewData, setInvoiceViewData] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workspaceResponse, warehouseResponse] = await Promise.all([
        api.get(`/procurement/purchase-orders/${id}/workspace`),
        api.get('/inventory/warehouses'),
      ]);
      const next = unwrap(workspaceResponse);
      setWorkspace(next);
      const warehouseData = unwrap(warehouseResponse);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : warehouseData?.items || []);
      setReceiptLines(Object.fromEntries((next.lines || []).filter((line: any) => line.remainingQty > 0).map((line: any) => [line.id, { selected: false, acceptedQty: line.remainingQty, rejectedQty: 0, supplierBatchNo: '' }])));
      setCommunication((value) => ({ ...value, recipient: next.purchaseOrder?.supplier?.email || '', subject: `Delivery update for ${next.purchaseOrder?.orderNo || ''}` }));
    } catch (error) { showApiError(error, 'Could not load purchase-order workspace'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const po = workspace?.purchaseOrder;
  const selectedLines = useMemo(() => (workspace?.lines || []).filter((line: any) => receiptLines[line.id]?.selected), [workspace, receiptLines]);

  async function createReceipt(submit: boolean) {
    if (!warehouseId) return toast.error('Select the receiving warehouse');
    if (!selectedLines.length) return toast.error('Select at least one product');
    setPosting(true);
    try {
      const response = await api.post(`/procurement/purchase-orders/${id}/receipt`, {
        warehouseId,
        rejectedWarehouseId: rejectedWarehouseId || warehouseId,
        items: selectedLines.map((line: any) => ({ purchaseOrderItemId: line.id, warehouseId, acceptedQty: Number(receiptLines[line.id].acceptedQty || 0), rejectedQty: Number(receiptLines[line.id].rejectedQty || 0), supplierBatchNo: receiptLines[line.id].supplierBatchNo || undefined, batchNo: receiptLines[line.id].batchNo || undefined })),
      });
      const receipt = unwrap(response);
      if (submit) await api.patch(`/procurement/purchase-receipts/${receipt.id}/status`, { status: 'SUBMITTED' });
      toast.success(submit ? 'Partial receipt posted to stock' : 'Partial receipt saved as draft');
      setReceiptOpen(false);
      await load();
    } catch (error) { showApiError(error, 'Could not create partial receipt'); }
    finally { setPosting(false); }
  }

  function openInvoiceModal(receipt: any, existingInvoice?: any) {
    if (existingInvoice) {
      setInvoiceForm({
        id: existingInvoice.id,
        date: existingInvoice.date ? existingInvoice.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        supplierId: workspace.purchaseOrder.supplierId,
        purchaseOrderId: workspace.purchaseOrder.id,
        purchaseReceiptId: receipt.id,
        supplierInvoiceNo: existingInvoice.supplierInvoiceNo || '',
        dueDate: existingInvoice.dueDate ? existingInvoice.dueDate.slice(0, 10) : '',
        currency: existingInvoice.currency || 'INR',
        exchangeRate: existingInvoice.exchangeRate || 1,
      });
      setInvoiceLines(receipt.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name,
        purchaseOrderItemId: item.purchaseOrderItemId,
        purchaseReceiptItemId: item.id,
        quantity: item.acceptedQty,
        unitPrice: item.rate,
        taxRate: 0,
        prAcceptedQty: item.acceptedQty,
        poRate: item.rate,
      })));
    } else {
      setInvoiceForm({
        date: new Date().toISOString().slice(0, 10),
        supplierId: workspace.purchaseOrder.supplierId,
        purchaseOrderId: workspace.purchaseOrder.id,
        purchaseReceiptId: receipt.id,
        supplierInvoiceNo: '',
        dueDate: '',
        currency: 'INR',
        exchangeRate: 1,
      });
      // Find PO rate for each item
      setInvoiceLines(receipt.items.map((item: any) => {
        const poItem = workspace.lines.find((l: any) => l.productId === item.productId);
        return {
          productId: item.productId,
          productName: item.product?.name,
          purchaseOrderItemId: item.purchaseOrderItemId,
          purchaseReceiptItemId: item.id,
          quantity: item.acceptedQty,
          unitPrice: poItem?.unitPrice ?? item.rate,
          taxRate: poItem?.taxRate ?? 0,
          prAcceptedQty: item.acceptedQty,
          poRate: poItem?.unitPrice ?? item.rate,
        };
      }));
    }
    setInvoiceOpen(true);
  }

  function viewInvoice(invoice: any) {
    setInvoiceViewData(invoice);
    setInvoiceViewOpen(true);
  }

  async function createInvoice(submit: boolean) {
    if (posting) return;
    setPosting(true);
    try {
      if (invoiceForm.id) {
        try {
          await api.delete(`/procurement/purchase-invoices/${invoiceForm.id}`);
        } catch (e) {
          console.error('Failed to delete old draft invoice', e);
        }
      }
      const payload = {
        ...invoiceForm,
        id: undefined,
        items: invoiceLines,
      };
      const response = await api.post('/procurement/purchase-invoices', payload);
      const invoiceId = response.data?.data?.id || response.data?.id;
      if (submit && invoiceId) {
        await api.patch(`/procurement/purchase-invoices/${invoiceId}/status`, { status: 'SUBMITTED' });
      }
      toast.success(submit ? 'Invoice submitted successfully' : 'Draft invoice saved');
      setInvoiceOpen(false);
      load();
    } catch (err: any) {
      showApiError(err, 'Creation failed');
    } finally {
      setPosting(false);
    }
  }

  async function sendCommunication() {
    try {
      await api.post(`/procurement/purchase-orders/${id}/communicate`, communication);
      toast.success(communication.target === 'SUPPLIER' ? 'Supplier email queued' : 'Customer update queued');
      setCommunication((value) => ({ ...value, message: '' }));
      await load();
    } catch (error) { showApiError(error, 'Could not send email'); }
  }

  if (loading && !workspace) return <div className="flex min-h-[420px] items-center justify-center text-sm text-gray-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading order workspace…</div>;
  if (!po) return <div className="p-6">Purchase order not found.</div>;

  return <div className="space-y-5 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Link href="/procurement/purchase-orders" className="mb-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-900"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Purchase orders</Link><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{po.orderNo}</h1><StatusBadge status={po.status} /></div><p className="mt-1 text-sm text-gray-500">{po.supplier?.name} · ordered {formatDate(po.date)} · promised {po.expectedDate ? formatDate(po.expectedDate) : 'not set'}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => setReceiptOpen(true)} disabled={!workspace.totals.remainingQty}><PackageCheck className="mr-2 h-4 w-4" />Receive partial delivery</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[
      ['Ordered', workspace.totals.orderedQty], ['Physically arrived', workspace.totals.arrivedQty], ['Accepted to stock', workspace.totals.acceptedQty], ['Rejected', workspace.totals.rejectedQty], ['Returned', workspace.totals.returnedQty], ['Vendor still owes', workspace.totals.remainingQty],
    ].map(([label, value], index) => <Card key={String(label)} className={index === 5 && Number(value) > 0 ? 'border-amber-300 bg-amber-50' : ''}><CardContent className="p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-semibold">{qty(value)}</p></CardContent></Card>)}</div>

    {!!workspace.alerts.length && <Card className="border-amber-300 bg-amber-50"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Overdue supplier commitments</CardTitle><CardDescription>These quantities are still outstanding after their promised date.</CardDescription></CardHeader><CardContent className="space-y-2">{workspace.alerts.map((alert: any) => <div key={alert.purchaseOrderItemId} className="rounded-md border border-amber-200 bg-white p-3 text-sm">{alert.message} · promised {formatDate(alert.promisedDate)}</div>)}</CardContent></Card>}

    <Card><CardHeader><CardTitle>Product receipt and balance tracker</CardTitle><CardDescription>Rejected quantities remain outstanding until replacement stock is accepted.</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[980px] text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr>{['Product','Ordered','Arrived','Accepted','Rejected','Returned','Remaining','Promised','Status'].map(value => <th className="px-4 py-3" key={value}>{value}</th>)}</tr></thead><tbody>{workspace.lines.map((line: any) => <tr className="border-t" key={line.id}><td className="px-4 py-3"><p className="font-medium">{line.product?.name}</p><p className="text-xs text-gray-500">{line.product?.sku || line.supplierItemCode || line.description}</p></td><td className="px-4 py-3">{qty(line.orderedQty)}</td><td className="px-4 py-3">{qty(line.arrivedQty)}</td><td className="px-4 py-3 text-emerald-700">{qty(line.acceptedQty)}</td><td className="px-4 py-3 text-red-600">{qty(line.rejectedQty)}</td><td className="px-4 py-3">{qty(line.returnedQty)}</td><td className="px-4 py-3 font-semibold">{qty(line.remainingQty)}</td><td className="px-4 py-3">{line.promisedDate ? formatDate(line.promisedDate) : '—'}</td><td className="px-4 py-3"><StatusBadge status={line.status} /></td></tr>)}</tbody></table></CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Receipt History */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" />Partial receipt history</CardTitle><CardDescription>Every supplier shipment remains independently auditable.</CardDescription></CardHeader><CardContent className="space-y-3">{!workspace.receipts.length && <p className="text-sm text-gray-500">No deliveries recorded yet.</p>}{workspace.receipts.map((receipt: any) => {
  const receiptInvoices = (workspace.invoices || []).filter((inv: any) => inv.purchaseReceiptId === receipt.id);
  const linkedInvoice = receiptInvoices.find((inv: any) => inv.status !== 'DRAFT') || receiptInvoices[0];
  return <div key={receipt.id} className="rounded-md border p-3"><div className="flex justify-between"><div><p className="font-medium">{receipt.receiptNo}</p><p className="text-xs text-gray-500">{formatDate(receipt.postingDate)}</p></div><StatusBadge status={receipt.status} /></div><div className="mt-2 flex items-center gap-5 text-sm"><span>Accepted <b>{qty(receipt.acceptedQty)}</b></span><span>Rejected <b>{qty(receipt.rejectedQty)}</b></span>{linkedInvoice ? (
  linkedInvoice.status === 'DRAFT' ? (
    <button onClick={() => openInvoiceModal(receipt, linkedInvoice)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors" title="Click to edit and resubmit draft invoice"><FileText className="h-3 w-3" />{linkedInvoice.invoiceNo} (Draft)</button>
  ) : (
    <button onClick={() => viewInvoice(linkedInvoice)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer" title="Click to view invoice details"><FileText className="h-3 w-3" />{linkedInvoice.invoiceNo}</button>
  )
) : receipt.status === 'SUBMITTED' && <button onClick={() => openInvoiceModal(receipt)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"><FileText className="h-3 w-3" />Create Invoice</button>}</div></div>})}</CardContent></Card>

      {/* Delay Communication */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />Delay communication</CardTitle><CardDescription>Email the supplier, or a linked customer after explicit approval.</CardDescription></CardHeader><CardContent className="space-y-3"><div><Label>Send to</Label><Select value={communication.target} onValueChange={(target) => { const order = workspace.relatedSalesOrders?.[0]; setCommunication({ ...communication, target, salesOrderId: target === 'CUSTOMER' ? order?.id || '' : '', recipient: target === 'CUSTOMER' ? order?.customer?.email || '' : po.supplier?.email || '' }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SUPPLIER">Supplier</SelectItem>{workspace.relatedSalesOrders?.length > 0 && <SelectItem value="CUSTOMER">Linked customer</SelectItem>}</SelectContent></Select></div>{communication.target === 'CUSTOMER' && workspace.relatedSalesOrders.length > 1 && <div><Label>Sales order</Label><Select value={communication.salesOrderId} onValueChange={(salesOrderId) => { const order = workspace.relatedSalesOrders.find((row: any) => row.id === salesOrderId); setCommunication({ ...communication, salesOrderId, recipient: order?.customer?.email || '' }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{workspace.relatedSalesOrders.map((order: any) => <SelectItem key={order.id} value={order.id}>{order.orderNo} · {order.customer?.name}</SelectItem>)}</SelectContent></Select></div>}<div><Label>Email</Label><Input value={communication.recipient} onChange={event => setCommunication({ ...communication, recipient: event.target.value })} /></div><div><Label>Subject</Label><Input value={communication.subject} onChange={event => setCommunication({ ...communication, subject: event.target.value })} /></div><div><Label>Message</Label><Textarea value={communication.message} onChange={event => setCommunication({ ...communication, message: event.target.value })} placeholder="Record the delay, revised date, and action being taken…" /></div><Button className="w-full" onClick={sendCommunication} disabled={!communication.recipient || !communication.message}><Mail className="mr-2 h-4 w-4" />Approve and queue email</Button></CardContent></Card>
    </div>

    {/* Invoice History */}
    {!!(workspace.invoices || []).length && <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Invoice history</CardTitle><CardDescription>All purchase invoices linked to this order.</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr>{['Invoice #','Date','Receipt','Status','Total','Outstanding',''].map(h => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{(workspace.invoices || []).map((inv: any) => <tr key={inv.id} className="border-t hover:bg-gray-50/50"><td className="px-4 py-3 font-medium">{inv.invoiceNo}</td><td className="px-4 py-3">{formatDate(inv.date)}</td><td className="px-4 py-3 text-xs">{inv.purchaseReceipt?.receiptNo || '—'}</td><td className="px-4 py-3"><StatusBadge status={inv.status} /></td><td className="px-4 py-3">{formatCurrency(inv.total)}</td><td className="px-4 py-3">{formatCurrency(inv.outstandingAmount)}</td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => viewInvoice(inv)}><Eye className="h-3.5 w-3.5 mr-1" />View</Button></td></tr>)}</tbody></table></CardContent></Card>}

    {/* Payment History */}
    {!!(workspace.payments || []).length && <Card><CardHeader><CardTitle className="flex items-center gap-2"><IndianRupee className="h-4 w-4" />Payment history</CardTitle><CardDescription>All payments recorded against this purchase order.</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr>{['Reference','Date','Mode','Amount','Status'].map(h => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>{(workspace.payments || []).map((pay: any) => <tr key={pay.id} className="border-t"><td className="px-4 py-3 font-medium">{pay.paymentNo || pay.reference || pay.id.slice(0, 12)}</td><td className="px-4 py-3">{formatDate(pay.date)}</td><td className="px-4 py-3">{pay.method?.replace(/_/g, ' ') || '—'}</td><td className="px-4 py-3">{formatCurrency(pay.amount)}</td><td className="px-4 py-3"><StatusBadge status={pay.status} /></td></tr>)}</tbody></table></CardContent></Card>}

    {/* Receipt Dialog */}
    <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Record supplier partial delivery</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid max-w-2xl gap-3 sm:grid-cols-2"><div><Label>Accepted stock warehouse *</Label><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} · ` : ''}{warehouse.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Rejected stock warehouse</Label><Select value={rejectedWarehouseId} onValueChange={setRejectedWarehouseId}><SelectTrigger><SelectValue placeholder="Defaults to receiving warehouse" /></SelectTrigger><SelectContent>{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} · ` : ''}{warehouse.name}</SelectItem>)}</SelectContent></Select></div></div><div className="max-h-[430px] space-y-2 overflow-y-auto">{workspace.lines.filter((line: any) => line.remainingQty > 0).map((line: any) => { const value = receiptLines[line.id] || {}; return <div key={line.id} className={`rounded-md border p-3 ${value.selected ? 'border-blue-300 bg-blue-50/40' : ''}`}><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={!!value.selected} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, selected: event.target.checked } })} />{line.product?.name}<span className="ml-auto text-xs text-gray-500">Vendor owes {qty(line.remainingQty)} {line.uom}</span></label>{value.selected && <div className="mt-3 grid gap-3 sm:grid-cols-4"><div><Label>Accepted qty</Label><Input type="number" min="0" max={line.remainingQty} step="any" value={value.acceptedQty} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, acceptedQty: event.target.value } })} /></div><div><Label>Rejected qty</Label><Input type="number" min="0" max={line.remainingQty} step="any" value={value.rejectedQty} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, rejectedQty: event.target.value } })} /></div><div><Label>Internal batch *</Label><Input value={value.batchNo} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, batchNo: event.target.value } })} /></div><div><Label>Supplier batch</Label><Input value={value.supplierBatchNo} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, supplierBatchNo: event.target.value } })} /></div></div>}</div>})}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReceiptOpen(false)}>Cancel</Button><Button variant="outline" disabled={posting} onClick={() => createReceipt(false)}>Save draft</Button><Button disabled={posting} onClick={() => createReceipt(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Receive and post stock</Button></div></div></DialogContent></Dialog>

    {/* Create Invoice Dialog */}
    <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create purchase invoice</DialogTitle><DialogDescription>Invoice against receipt from {workspace?.purchaseOrder?.supplier?.name}</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Invoice Date</Label><Input type="date" value={invoiceForm.date} onChange={event => setInvoiceForm({ ...invoiceForm, date: event.target.value })} /></div><div><Label>Due Date (Optional)</Label><Input type="date" value={invoiceForm.dueDate} onChange={event => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })} /></div><div><Label>Supplier Invoice No</Label><Input value={invoiceForm.supplierInvoiceNo} onChange={event => setInvoiceForm({ ...invoiceForm, supplierInvoiceNo: event.target.value })} /></div></div><div className="max-h-[300px] space-y-2 overflow-y-auto">{invoiceLines.map((line: any, idx: number) => <div key={idx} className="rounded-md border p-3"><label className="flex items-center gap-2 font-medium text-sm">{line.productName}</label><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><Label>Invoice qty</Label><Input type="number" min="0" step="any" value={line.quantity} onChange={event => { const newLines = [...invoiceLines]; newLines[idx].quantity = event.target.value; setInvoiceLines(newLines); }} /><p className="mt-0.5 text-[10px] text-gray-400">PR accepted: {qty(line.prAcceptedQty)}</p></div><div><Label>Unit Price</Label><Input type="number" min="0" step="any" value={line.unitPrice} onChange={event => { const newLines = [...invoiceLines]; newLines[idx].unitPrice = event.target.value; setInvoiceLines(newLines); }} /><p className="mt-0.5 text-[10px] text-gray-400">PO rate: {formatCurrency(line.poRate)}</p></div><div><Label>Tax Rate %</Label><Input type="number" min="0" step="any" value={line.taxRate} onChange={event => { const newLines = [...invoiceLines]; newLines[idx].taxRate = event.target.value; setInvoiceLines(newLines); }} /></div></div></div>)}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button><Button variant="outline" disabled={posting} onClick={() => createInvoice(false)}>Save draft</Button><Button disabled={posting} onClick={() => createInvoice(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Create and submit</Button></div></div></DialogContent></Dialog>

    {/* View Invoice Dialog (Read-Only) */}
    <Dialog open={invoiceViewOpen} onOpenChange={setInvoiceViewOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2">{invoiceViewData?.invoiceNo} <StatusBadge status={invoiceViewData?.status} /></DialogTitle><DialogDescription>Invoice detail for {workspace?.purchaseOrder?.supplier?.name}</DialogDescription></DialogHeader>{invoiceViewData && <div className="space-y-4"><div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Invoice Date</span><span className="font-medium">{formatDate(invoiceViewData.date)}</span></div><div className="flex justify-between"><span className="text-gray-500">Due Date</span><span className="font-medium">{invoiceViewData.dueDate ? formatDate(invoiceViewData.dueDate) : '—'}</span></div><div className="flex justify-between"><span className="text-gray-500">Supplier Invoice No</span><span className="font-medium">{invoiceViewData.supplierInvoiceNo || '—'}</span></div><div className="flex justify-between"><span className="text-gray-500">Linked Receipt</span><span className="font-medium">{invoiceViewData.purchaseReceipt?.receiptNo || '—'}</span></div></div><div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Unit Price</th><th className="px-4 py-2">Tax %</th><th className="px-4 py-2 text-right">Amount</th></tr></thead><tbody>{(invoiceViewData.items || []).map((item: any) => <tr key={item.id} className="border-t"><td className="px-4 py-2 font-medium">{item.product?.name || item.productId?.slice(0,8)}</td><td className="px-4 py-2">{qty(item.quantity)}</td><td className="px-4 py-2">{formatCurrency(item.unitPrice)}</td><td className="px-4 py-2">{Number(item.taxRate || 0)}%</td><td className="px-4 py-2 text-right">{formatCurrency(item.total || (Number(item.quantity || 0) * Number(item.unitPrice || 0)))}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3"><span className="text-sm font-medium text-gray-700">Grand Total</span><span className="text-lg font-bold">{formatCurrency(invoiceViewData.total)}</span></div><div className="flex justify-end"><Button variant="outline" onClick={() => setInvoiceViewOpen(false)}>Close</Button></div></div>}</DialogContent></Dialog>
  </div>;
}
