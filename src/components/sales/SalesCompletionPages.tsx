'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const reportTypes = [
  ['open-order-book', 'Open order book'], ['quotation-conversion', 'Quotation conversion'],
  ['delivery-performance', 'Delivery performance'], ['price-variance', 'Price variance'],
  ['gross-margin', 'Gross margin'], ['performance', 'Customer / territory performance'],
  ['backorders', 'Backorders'], ['order-ageing', 'Sales order ageing'],
];

function JsonTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-gray-500">No records found.</p>;
  const columns = Object.keys(rows[0]).filter(k => !Array.isArray(rows[0][k]) && typeof rows[0][k] !== 'object').slice(0, 8);
  return <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">{columns.map(c => <th key={c} className="p-2 text-left font-medium">{c.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index} className="border-b">{columns.map(c => <td key={c} className="max-w-56 truncate p-2">{String(row[c] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}

export function SalesFulfilmentPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api.get('/sales/fulfilment-dashboard').then(r => setRows(r.data?.data || [])).catch(e => showApiError(e, 'Could not load fulfilment'));
  useEffect(() => { load(); }, []);
  const planProduction = async (order: any) => { try { const items = (order.items || []).map((item: any) => ({ salesOrderItemId: item.id, quantity: Math.max(0, Number(item.quantity) - Number(item.producedQty || 0)) })).filter((item: any) => item.quantity > 0); if (!items.length) return showApiSuccess('Nothing remains to produce'); await api.post(`/sales/orders/${order.id}/production-plan`, { items, targetDate: order.deliveryDate }); showApiSuccess('Production plan created'); load(); } catch (e) { showApiError(e, 'Could not create production plan'); } };
  return <div><PageHeader title="Sales Fulfilment" description="Ordered, reserved, produced, delivered, invoice count, billed and pending quantities" /><Card><CardContent className="pt-6"><div className="space-y-3">{rows.map(order => { const ordered = Number(order.orderedQty || 0), invoiced = Number(order.invoicedQty || 0), delivered = Number(order.deliveredQty || 0); return <div key={order.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono font-semibold text-blue-600">{order.orderNo}</p><p className="text-sm text-gray-500">{order.customer?.name} · {order.status} · Credit: {order.creditStatus}</p></div><Button size="sm" variant="outline" disabled={ordered <= Number(order.producedQty || 0)} onClick={() => planProduction(order)}>Plan Production</Button></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-4 lg:grid-cols-8"><span>Ordered: {ordered}</span><span>Produced: {Number(order.producedQty || 0)}</span><span>Delivered: {delivered}</span><span>Pending delivery: {Math.max(0, ordered - delivered)}</span><span>Invoices: {order.invoices?.length || 0}</span><span>Billed qty: {invoiced}</span><span>Pending billing: {Math.max(0, ordered - invoiced)}</span><span>Backorder: {Number(order.backorderQty || 0)}</span></div></div>; })}{!rows.length && <p className="py-8 text-center text-sm text-gray-500">No active fulfilment orders.</p>}</div></CardContent></Card></div>;
}

export function SalesReportsPage() {
  const [type, setType] = useState(reportTypes[0][0]), [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.get(`/sales/reports/${type}`).then(r => setRows(Array.isArray(r.data?.data) ? r.data.data : [r.data?.data])).catch(e => showApiError(e, 'Could not load report')); }, [type]);
  return <div><PageHeader title="Sales Reports" description="Conversion, delivery, margin, variance, backorder, performance and ageing" /><div className="mb-4 flex flex-wrap gap-2">{reportTypes.map(([key, label]) => <Button key={key} size="sm" variant={type === key ? 'default' : 'outline'} onClick={() => setType(key)}>{label}</Button>)}</div><Card><CardHeader><CardTitle>{reportTypes.find(r => r[0] === type)?.[1]}</CardTitle></CardHeader><CardContent><JsonTable rows={rows} /></CardContent></Card></div>;
}

export function SalesConfigurationPage() {
  const sections = [
    ['Pricing engine', 'Contract, customer-group, territory/channel and general prices; quantity breaks, UOM, promotions and margin approval.', '/inventory/pricing'],
    ['Credit control', 'Maintain customer limits, credit days and hold state. Exposure is enforced when an order is submitted.', '/customers'],
    ['Tax templates', 'Configure HSN/tax templates. Sales documents store branch, place-of-supply, GST mode and address snapshots.', '/invoicing/tax-templates'],
    ['Approvals', 'Discount, margin and credit exceptions use the platform approval engine.', '/settings'],
  ];
  return <div><PageHeader title="Sales Configuration" description="Masters and policies used by the end-to-end sales lifecycle" /><div className="grid gap-4 md:grid-cols-2">{sections.map(([title, text, href]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-gray-600">{text}</p><Button asChild variant="outline"><Link href={href}>Open configuration</Link></Button></CardContent></Card>)}</div></div>;
}
