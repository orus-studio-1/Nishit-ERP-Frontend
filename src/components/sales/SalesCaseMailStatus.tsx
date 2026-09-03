'use client';

import { useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Sales Case aggregate documents are intentionally polymorphic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function SalesCaseMailStatus({ communications, onChanged }: { communications: Row[]; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState('');
  const rows = communications.filter(row => ['EMAIL','WHATSAPP'].includes(row.channel));
  const retry = async (id: string) => { setBusy(id); try { await api.post(`/sales/communications/${id}/retry`); showApiSuccess('Message queued for retry'); await onChanged(); } catch (error) { showApiError(error, 'Could not retry message'); } finally { setBusy(''); } };
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Customer message delivery</CardTitle><CardDescription>Recipient, delivery state and retry controls for quotations, dispatches and delivery confirmations.</CardDescription></CardHeader><CardContent className="space-y-2">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{row.kind.replaceAll('_', ' ')}</p><p className="text-muted-foreground">{row.channel} → {row.recipient || 'recipient missing'}</p><p className="text-xs text-muted-foreground">{row.subject}</p></div><div className="flex items-center gap-2"><StatusBadge status={row.status} />{row.status === 'FAILED' && <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => retry(row.id)}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}</div></div>)}{!rows.length && <p className="text-sm text-muted-foreground">No email or WhatsApp message has been created for this case.</p>}</CardContent></Card>;
}
