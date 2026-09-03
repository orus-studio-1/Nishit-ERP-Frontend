'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Sales Case aggregate documents are intentionally polymorphic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function SalesCaseShipmentControl({ orders, customerEmail, onChanged }: { orders: Row[]; customerEmail?: string; onChanged: () => Promise<void> | void }) {
  const notes = orders.flatMap(order => (order.deliveryNotes || []).map((note: Row) => ({ ...note, orderNo: order.orderNo })));
  const [values, setValues] = useState<Record<string, Row>>({}), [busy, setBusy] = useState('');
  const value = (note: Row, key: string) => values[note.id]?.[key] ?? note[key] ?? '';
  const change = (noteId: string, key: string, next: string) => setValues(current => ({ ...current, [noteId]: { ...(current[noteId] || {}), [key]: next } }));
  const update = async (note: Row, shipmentStatus: string) => { const payload: Row = { sendEmailApproved: values[note.id]?.sendEmailApproved ?? true, recipientEmail: values[note.id]?.recipientEmail || customerEmail, ...values[note.id], shipmentStatus }; if (shipmentStatus === 'DELIVERED' && !String(payload.proofOfDelivery || note.proofOfDelivery || '').trim()) return showApiError(new Error('Proof of delivery is required'), 'Proof of delivery is required'); setBusy(note.id); try { await api.patch(`/delivery-notes/${note.id}/shipment`, payload); showApiSuccess(`Shipment marked ${shipmentStatus.toLowerCase()}`); await onChanged(); } catch (error) { showApiError(error, 'Could not update shipment'); } finally { setBusy(''); } };
  return <Card><CardHeader><CardTitle>Shipment tracking and delivery confirmation</CardTitle><CardDescription>Dispatch, transit and confirmed delivery are separate auditable events.</CardDescription></CardHeader><CardContent className="space-y-4">{notes.map(note => <div key={note.id} className="space-y-3 rounded-lg border p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-mono font-semibold">{note.deliveryNo}</p><p className="text-xs text-muted-foreground">{note.orderNo}</p></div><StatusBadge status={note.shipmentStatus || note.status} /></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><label className="space-y-1"><Label>Transporter</Label><Input value={value(note, 'transporter')} onChange={event => change(note.id, 'transporter', event.target.value)} /></label><label className="space-y-1"><Label>LR / tracking number</Label><Input value={value(note, 'trackingNo')} onChange={event => change(note.id, 'trackingNo', event.target.value)} /></label><label className="space-y-1"><Label>Expected delivery</Label><Input type="datetime-local" value={String(value(note, 'expectedDeliveryAt')).slice(0, 16)} onChange={event => change(note.id, 'expectedDeliveryAt', event.target.value)} /></label><label className="space-y-1"><Label>Proof of delivery</Label><Input value={value(note, 'proofOfDelivery')} onChange={event => change(note.id, 'proofOfDelivery', event.target.value)} placeholder="Reference or attachment URL" /></label></div><div className="flex flex-wrap gap-2">{note.status === 'SUBMITTED' && !['DELIVERED','RETURNED'].includes(note.shipmentStatus) && <><Button variant="outline" disabled={busy === note.id} onClick={() => update(note, 'IN_TRANSIT')}>Save and mark in transit</Button><Button disabled={busy === note.id} onClick={() => update(note, 'DELIVERED')}>Confirm customer delivery</Button></>}{note.shipmentStatus === 'DELIVERED' && <Button variant="destructive" disabled={busy === note.id} onClick={() => update(note, 'RETURNED')}>Record return</Button>}</div></div>)}{!notes.length && <p className="text-sm text-muted-foreground">No dispatch has been created for this case.</p>}</CardContent></Card>;
}
