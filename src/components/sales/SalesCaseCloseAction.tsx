'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SalesCaseCloseAction({ caseId, status, onChanged }: { caseId: string; status: string; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  if (status !== 'WON') return null;
  const close = async () => { const reason = window.prompt('Closure note', 'All fulfilment, invoicing and payment obligations completed'); if (!reason?.trim()) return; setBusy(true); try { await api.post(`/sales/enquiries/${caseId}/close`, { reason }); showApiSuccess('Sales case closed'); await onChanged(); } catch (error) { showApiError(error, 'The case cannot close until delivery, invoicing, payment and alerts are complete'); } finally { setBusy(false); } };
  return <Card className="border-green-200"><CardHeader><CardTitle className="text-base">Controlled case closure</CardTitle><CardDescription>Closure succeeds only after every quantity is delivered or short-closed, invoices are fully paid and no fulfilment alert remains.</CardDescription></CardHeader><CardContent><Button disabled={busy} onClick={close}><LockKeyhole className="mr-2 h-4 w-4" />Validate and close sales case</Button></CardContent></Card>;
}
