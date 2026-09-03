'use client';

import Link from 'next/link';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function SalesCaseDeliveryConfirmation({ orders }: { orders: Row[]; customerEmail?: string; onChanged: () => Promise<void> | void }) {
  const notes = orders.flatMap(order => (order.deliveryNotes || []).map((note: Row) => ({ ...note, orderNo: order.orderNo })));
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Dispatch and delivery status</CardTitle><CardDescription>This is synchronized from Delivery Notes. Shipment operations are managed in Invoicing.</CardDescription></div><Button asChild variant="outline"><Link href="/invoicing/delivery-notes"><Truck className="mr-2 h-4 w-4" />Manage Delivery Notes</Link></Button></div></CardHeader><CardContent className="space-y-4">
    {notes.map(note => <div key={note.id} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono font-semibold">{note.deliveryNo}</p><p className="text-xs text-muted-foreground">{note.orderNo} · dispatched {note.dispatchedAt ? new Date(note.dispatchedAt).toLocaleString('en-IN') : 'pending'}</p></div><StatusBadge status={note.shipmentStatus || note.status} /></div>
      <div className="grid gap-2 text-xs sm:grid-cols-4"><Fact label="Transporter" value={note.transporter} /><Fact label="LR / Tracking" value={note.trackingNo} /><Fact label="Expected delivery" value={note.expectedDeliveryAt ? new Date(note.expectedDeliveryAt).toLocaleString('en-IN') : undefined} /><Fact label="Actual delivery" value={note.deliveredAt ? new Date(note.deliveredAt).toLocaleString('en-IN') : undefined} /></div>
      <div className="overflow-x-auto rounded border"><table className="w-full text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">Product</th><th className="p-2 text-right">Dispatched</th><th className="p-2 text-right">Delivered</th><th className="p-2 text-right">Returned</th></tr></thead><tbody>{(note.items || []).map((item: Row) => <tr key={item.id} className="border-t"><td className="p-2">{item.product?.name || item.itemCode}</td><td className="p-2 text-right">{Number(item.quantity || 0)}</td><td className="p-2 text-right">{Number(item.deliveredQty || 0)}</td><td className="p-2 text-right">{Number(item.returnedQty || 0)}</td></tr>)}</tbody></table></div>
      {note.failedDeliveryReason && <p className="rounded bg-red-50 p-2 text-sm text-red-700">Failed-delivery reason: {note.failedDeliveryReason}</p>}
    </div>)}
    {!notes.length && <p className="text-sm text-muted-foreground">No dispatch has been created for this case.</p>}
  </CardContent></Card>;
}

function Fact({ label, value }: { label: string; value?: string }) { return <div><p className="uppercase text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value || '—'}</p></div>; }
