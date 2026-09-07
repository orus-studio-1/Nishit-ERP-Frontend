'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Mail, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';

const qty = (value: any) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
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
        items: selectedLines.map((line: any) => ({ purchaseOrderItemId: line.id, warehouseId, acceptedQty: Number(receiptLines[line.id].acceptedQty || 0), rejectedQty: Number(receiptLines[line.id].rejectedQty || 0), supplierBatchNo: receiptLines[line.id].supplierBatchNo || undefined })),
      });
      const receipt = unwrap(response);
      if (submit) await api.patch(`/procurement/purchase-receipts/${receipt.id}/status`, { status: 'SUBMITTED' });
      toast.success(submit ? 'Partial receipt posted to stock' : 'Partial receipt saved as draft');
      setReceiptOpen(false);
      await load();
    } catch (error) { showApiError(error, 'Could not create partial receipt'); }
    finally { setPosting(false); }
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
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" />Partial receipt history</CardTitle><CardDescription>Every supplier shipment remains independently auditable.</CardDescription></CardHeader><CardContent className="space-y-3">{!workspace.receipts.length && <p className="text-sm text-gray-500">No deliveries recorded yet.</p>}{workspace.receipts.map((receipt: any) => <div key={receipt.id} className="rounded-md border p-3"><div className="flex justify-between"><div><p className="font-medium">{receipt.receiptNo}</p><p className="text-xs text-gray-500">{formatDate(receipt.postingDate)}</p></div><StatusBadge status={receipt.status} /></div><div className="mt-2 flex gap-5 text-sm"><span>Accepted <b>{qty(receipt.acceptedQty)}</b></span><span>Rejected <b>{qty(receipt.rejectedQty)}</b></span></div></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />Delay communication</CardTitle><CardDescription>Email the supplier, or a linked customer after explicit approval.</CardDescription></CardHeader><CardContent className="space-y-3"><div><Label>Send to</Label><Select value={communication.target} onValueChange={(target) => { const order = workspace.relatedSalesOrders?.[0]; setCommunication({ ...communication, target, salesOrderId: target === 'CUSTOMER' ? order?.id || '' : '', recipient: target === 'CUSTOMER' ? order?.customer?.email || '' : po.supplier?.email || '' }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SUPPLIER">Supplier</SelectItem>{workspace.relatedSalesOrders?.length > 0 && <SelectItem value="CUSTOMER">Linked customer</SelectItem>}</SelectContent></Select></div>{communication.target === 'CUSTOMER' && workspace.relatedSalesOrders.length > 1 && <div><Label>Sales order</Label><Select value={communication.salesOrderId} onValueChange={(salesOrderId) => { const order = workspace.relatedSalesOrders.find((row: any) => row.id === salesOrderId); setCommunication({ ...communication, salesOrderId, recipient: order?.customer?.email || '' }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{workspace.relatedSalesOrders.map((order: any) => <SelectItem key={order.id} value={order.id}>{order.orderNo} · {order.customer?.name}</SelectItem>)}</SelectContent></Select></div>}<div><Label>Email</Label><Input value={communication.recipient} onChange={event => setCommunication({ ...communication, recipient: event.target.value })} /></div><div><Label>Subject</Label><Input value={communication.subject} onChange={event => setCommunication({ ...communication, subject: event.target.value })} /></div><div><Label>Message</Label><Textarea value={communication.message} onChange={event => setCommunication({ ...communication, message: event.target.value })} placeholder="Record the delay, revised date, and action being taken…" /></div><Button className="w-full" onClick={sendCommunication} disabled={!communication.recipient || !communication.message}><Mail className="mr-2 h-4 w-4" />Approve and queue email</Button></CardContent></Card>
    </div>

    <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Record supplier partial delivery</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid max-w-2xl gap-3 sm:grid-cols-2"><div><Label>Accepted stock warehouse *</Label><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} · ` : ''}{warehouse.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Rejected stock warehouse</Label><Select value={rejectedWarehouseId} onValueChange={setRejectedWarehouseId}><SelectTrigger><SelectValue placeholder="Defaults to receiving warehouse" /></SelectTrigger><SelectContent>{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} · ` : ''}{warehouse.name}</SelectItem>)}</SelectContent></Select></div></div><div className="max-h-[430px] space-y-2 overflow-y-auto">{workspace.lines.filter((line: any) => line.remainingQty > 0).map((line: any) => { const value = receiptLines[line.id] || {}; return <div key={line.id} className={`rounded-md border p-3 ${value.selected ? 'border-blue-300 bg-blue-50/40' : ''}`}><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={!!value.selected} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, selected: event.target.checked } })} />{line.product?.name}<span className="ml-auto text-xs text-gray-500">Vendor owes {qty(line.remainingQty)} {line.uom}</span></label>{value.selected && <div className="mt-3 grid gap-3 sm:grid-cols-3"><div><Label>Accepted qty</Label><Input type="number" min="0" max={line.remainingQty} step="any" value={value.acceptedQty} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, acceptedQty: event.target.value } })} /></div><div><Label>Rejected qty</Label><Input type="number" min="0" max={line.remainingQty} step="any" value={value.rejectedQty} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, rejectedQty: event.target.value } })} /></div><div><Label>Supplier batch</Label><Input value={value.supplierBatchNo} onChange={event => setReceiptLines({ ...receiptLines, [line.id]: { ...value, supplierBatchNo: event.target.value } })} /></div></div>}</div>})}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReceiptOpen(false)}>Cancel</Button><Button variant="outline" disabled={posting} onClick={() => createReceipt(false)}>Save draft</Button><Button disabled={posting} onClick={() => createReceipt(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Receive and post stock</Button></div></div></DialogContent></Dialog>
  </div>;
}
