'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import api from '@/lib/api';
import { getApiErrorMessage, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function SalesCaseCloseAction({ caseId, status, onChanged }: { caseId: string; status: string; onChanged: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (status !== 'WON') return null;

  const close = async () => {
    const closureReason = reason.trim();
    if (!closureReason) {
      setError('Enter a closure note to continue.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.post('/sales/enquiries/' + caseId + '/close', { reason: closureReason });
      setOpen(false);
      setReason('');
      showApiSuccess('Sales case closed');
      await onChanged();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not close the sales case. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="text-base">Controlled case closure</CardTitle>
          <CardDescription>Closure succeeds only after every quantity is delivered or short-closed, invoices are fully paid and no fulfilment alert remains.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => { setError(''); setOpen(true); }}>
            <LockKeyhole className="mr-2 h-4 w-4" />
            Validate and close sales case
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) { setOpen(nextOpen); if (!nextOpen) setError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close sales case</DialogTitle>
            <DialogDescription>
              We will check delivery, short-close, invoice payment and open fulfilment alerts before closing. If any requirement is incomplete, the reason will appear here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="sales-case-closure-note" className="text-sm font-medium">Closure note <span className="text-red-600">*</span></label>
            <Textarea
              id="sales-case-closure-note"
              value={reason}
              onChange={(event) => { setReason(event.target.value); if (error) setError(''); }}
              placeholder="Describe why this sales case is ready to close"
              rows={3}
              aria-invalid={!!error}
              aria-describedby={error ? 'sales-case-closure-error' : undefined}
              disabled={busy}
            />
            {error && <p id="sales-case-closure-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={close} disabled={busy}>{busy ? 'Checking requirements...' : 'Validate and close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
