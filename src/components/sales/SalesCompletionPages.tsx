'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

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
  const [search, setSearch] = useState('');
  const load = () => api.get('/sales/fulfilment-dashboard').then(r => setRows(r.data?.data || [])).catch(e => showApiError(e, 'Could not load fulfilment'));
  useEffect(() => { load(); }, []);
  const createRequest = async (line: any) => { try { await api.post(`/sales/orders/${line.salesOrderId}/material-request`, { salesOrderItemId: line.id }); showApiSuccess('Material request created for the exact shortage'); load(); } catch (e) { showApiError(e, 'Could not create material request'); } };
  const visible = rows.filter(line => `${line.orderNo} ${line.customer} ${line.sku} ${line.product}`.toLowerCase().includes(search.toLowerCase()));
  const sum = (key: string) => visible.reduce((total, row) => total + Number(row[key] || 0), 0);
  return <div className="space-y-4"><PageHeader title="Order Fulfilment Tracker" description="Customer demand → stock → purchase → supplier receipt → partial dispatch → customer delivery" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Ordered','orderedQty'],['Reserved','reservedForOrder'],['To purchase','procurementGap'],['Incoming','incomingQty'],['Pending delivery','remainingToDeliver']].map(([label,key]) => <Card key={key}><CardContent className="pt-4"><p className="text-xs uppercase text-gray-500">{label}</p><p className="text-2xl font-semibold">{sum(key)}</p></CardContent></Card>)}</div>
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Open product-line tracker</CardTitle><p className="text-sm text-gray-500">Every row follows one customer order product through inventory, supplier ordering and delivery.</p></div><Input className="max-w-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer, SKU or product…" /></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="min-w-[1650px] w-full text-sm"><thead className="border-y bg-gray-50"><tr>{['Customer / order','Product','Ordered','On hand','Reserved','To order','Supplier ordered','Supplier received','Incoming','Customer dispatched','Customer delivered','Remaining dispatch','Remaining delivery','Client promise','Supplier ETA','Risk','Actions'].map(label => <th key={label} className="p-2 text-right first:text-left">{label}</th>)}</tr></thead><tbody>{visible.map(line => <tr key={line.id} className="border-b align-top"><td className="p-2"><p className="font-medium">{line.customer}</p><p className="font-mono text-xs text-blue-600">{line.orderNo}</p></td><td className="p-2"><p className="font-medium">{line.product}</p><p className="text-xs text-gray-500">{line.sku}</p></td>{['orderedQty','onHandQty','reservedForOrder','procurementGap','supplierOrderedQty','supplierReceivedQty','incomingQty','dispatchedQty','deliveredQty','remainingToDispatch','remainingToDeliver'].map(key => <td key={key} className={`p-2 text-right ${key === 'procurementGap' && Number(line[key]) > 0 ? 'font-semibold text-red-600' : ''}`}>{Number(line[key] || 0)}</td>)}<td className="p-2 text-right">{line.promisedDate ? formatDate(line.promisedDate) : '—'}<small className="block text-gray-500">{line.daysToPromise == null ? '' : line.daysToPromise < 0 ? `${Math.abs(line.daysToPromise)}d overdue` : `${line.daysToPromise}d left`}</small></td><td className="p-2 text-right">{line.nextSupplierDate ? formatDate(line.nextSupplierDate) : '—'}{line.purchaseOrders?.map((po: any) => <small key={po.id} className="block text-gray-500">{po.supplier} · {po.status}</small>)}</td><td className="p-2 text-right"><StatusBadge status={line.risk} /></td><td className="p-2"><div className="flex min-w-44 flex-col gap-1">{line.procurementGap > 0 && <Button size="sm" variant="outline" onClick={() => createRequest(line)}>Create material request ({line.procurementGap})</Button>}<Button asChild size="sm" variant="outline"><Link href={`/invoicing/delivery-notes?salesOrderId=${line.salesOrderId}`}>Create partial dispatch</Link></Button>{line.salesCaseId && <Button asChild size="sm" variant="ghost"><Link href={`/sales/enquiries/${line.salesCaseId}`}>Open sales case</Link></Button>}<Button asChild size="sm" variant="ghost"><Link href="/procurement/purchase-orders">Purchase orders</Link></Button></div></td></tr>)}{!visible.length && <tr><td colSpan={17} className="p-10 text-center text-gray-500">No fulfilment lines match.</td></tr>}</tbody></table></div></CardContent></Card>
  </div>;
}

export function SalesReportsPage() {
  const [type, setType] = useState(reportTypes[0][0]), [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.get(`/sales/reports/${type}`).then(r => setRows(Array.isArray(r.data?.data) ? r.data.data : [r.data?.data])).catch(e => showApiError(e, 'Could not load report')); }, [type]);
  return <div><PageHeader title="Sales Reports" description="Conversion, delivery, margin, variance, backorder, performance and ageing" /><div className="mb-4 flex flex-wrap gap-2">{reportTypes.map(([key, label]) => <Button key={key} size="sm" variant={type === key ? 'default' : 'outline'} onClick={() => setType(key)}>{label}</Button>)}</div><Card><CardHeader><CardTitle>{reportTypes.find(r => r[0] === type)?.[1]}</CardTitle></CardHeader><CardContent><JsonTable rows={rows} /></CardContent></Card></div>;
}

export function SalesConfigurationPage() {
  const [policy, setPolicy] = useState<any>({ warningDays: [7, 3, 1, 0], notifyAssignedSalesperson: true, notifyManagers: true, notifyProcurement: true, isActive: true });
  useEffect(() => { api.get('/sales/alert-policy').then(response => setPolicy(response.data?.data || policy)).catch(error => showApiError(error, 'Could not load sales alert policy')); }, []);
  const savePolicy = async () => { try { await api.put('/sales/alert-policy', policy); showApiSuccess('Delivery alert policy saved'); } catch (error) { showApiError(error, 'Could not save alert policy'); } };
  const sections = [
    ['Pricing engine', 'Contract, customer-group, territory/channel and general prices; quantity breaks, UOM, promotions and margin approval.', '/inventory/pricing'],
    ['Credit control', 'Maintain customer limits, credit days and hold state. Exposure is enforced when an order is submitted.', '/customers'],
    ['Tax templates', 'Configure HSN/tax templates. Sales documents store branch, place-of-supply, GST mode and address snapshots.', '/invoicing/tax-templates'],
    ['Approvals', 'Discount, margin and credit exceptions use the platform approval engine.', '/settings'],
  ];
  return <div><PageHeader title="Sales Configuration" description="Masters and policies used by the end-to-end sales lifecycle" /><Card className="mb-4"><CardHeader><CardTitle>Delivery commitment alerts</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="mb-2 text-sm text-gray-600">Alert days before each item-level committed delivery date</p><Input value={(policy.warningDays || []).join(', ')} onChange={event => setPolicy({ ...policy, warningDays: event.target.value.split(',').map(value => Number(value.trim())).filter(Number.isFinite) })} placeholder="7, 3, 1, 0" /></div><div className="grid gap-2 sm:grid-cols-3">{[['notifyAssignedSalesperson','Assigned salesperson'],['notifyManagers','Sales managers'],['notifyProcurement','Procurement / production']].map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={!!policy[key]} onChange={event => setPolicy({ ...policy, [key]: event.target.checked })} />{label}</label>)}</div><Button onClick={savePolicy}>Save alert policy</Button></CardContent></Card><div className="grid gap-4 md:grid-cols-2">{sections.map(([title, text, href]) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-gray-600">{text}</p><Button asChild variant="outline"><Link href={href}>Open configuration</Link></Button></CardContent></Card>)}</div></div>;
}
