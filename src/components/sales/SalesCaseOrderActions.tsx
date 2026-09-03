'use client';

import { useEffect, useState } from 'react';
import { PauseCircle, PlayCircle, ShieldCheck, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sales Case aggregate documents are intentionally polymorphic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = Record<string, any>;

export function SalesCaseOrderActions({ order, onChanged }: { order: Order; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState('');
  const [warehouses, setWarehouses] = useState<Order[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>(String(order.sourceWarehouseId || ''));
  useEffect(() => { if (order.status !== 'DRAFT') return; api.get('/inventory/warehouses', { params: { isActive: true, limit: 500 } }).then(response => { const rows = response.data?.data?.items || response.data?.data || []; setWarehouses(rows); setWarehouseId(current => current || rows[0]?.id || ''); }).catch(error => showApiError(error, 'Could not load reservation warehouses')); }, [order.status]);
  const operate = async (operation: string, body?: object) => { setBusy(operation); try { await api.post(`/sales/orders/${order.id}/${operation}`, body); showApiSuccess(`Sales order ${operation.replaceAll('-', ' ')} completed`); await onChanged(); } catch (error) { showApiError(error, `Could not ${operation.replaceAll('-', ' ')} sales order`); } finally { setBusy(''); } };
  const withReason = (operation: 'hold' | 'cancel' | 'close') => { const reason = window.prompt(`Mandatory reason to ${operation} this order`); if (!reason?.trim()) return; void operate(operation, { reason }); };
  return <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
    {order.status === 'DRAFT' && <><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger className="w-64"><SelectValue placeholder="Reservation warehouse" /></SelectTrigger><SelectContent searchable searchPlaceholder="Search warehouses…">{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</SelectItem>)}</SelectContent></Select><Button disabled={!!busy || !warehouseId} onClick={() => operate('submit', { warehouseId })}><ShieldCheck className="mr-2 h-4 w-4" />Confirm order and reserve stock</Button></>}
    {!['DRAFT','CANCELLED','CLOSED','DELIVERED','ON_HOLD'].includes(order.status) && <Button variant="outline" disabled={!!busy} onClick={() => withReason('hold')}><PauseCircle className="mr-2 h-4 w-4" />Place on hold</Button>}
    {order.status === 'ON_HOLD' && <Button disabled={!!busy} onClick={() => operate('resume')}><PlayCircle className="mr-2 h-4 w-4" />Resume order</Button>}
    {!['CANCELLED','CLOSED','DELIVERED'].includes(order.status) && <Button variant="outline" disabled={!!busy} onClick={() => withReason('close')}>Close order</Button>}
    {!['CANCELLED','CLOSED','DELIVERED'].includes(order.status) && <Button variant="destructive" disabled={!!busy} onClick={() => withReason('cancel')}><XCircle className="mr-2 h-4 w-4" />Cancel order</Button>}
  </div>;
}
