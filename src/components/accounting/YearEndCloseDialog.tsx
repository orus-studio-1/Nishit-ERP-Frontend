'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Year = { id: string; name: string; startDate: string; endDate: string };
type Account = { id: string; code: string; name: string; isGroup?: boolean };

/**
 * Year-end close: moves the year's income and expense balances into a retained earnings account
 * (a Period Closing Voucher) and locks the fiscal year against further postings.
 */
export function YearEndCloseDialog({ year, onOpenChange, onClosed }: { year: Year | null; onOpenChange: (open: boolean) => void; onClosed: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!year) return;
    api.get('/accounting/accounts', { params: { type: 'EQUITY' } })
      .then((res) => {
        const rows: Account[] = (res.data?.data || []).filter((a: Account) => !a.isGroup);
        setAccounts(rows);
        const retained = rows.find((a) => /retained/i.test(a.name));
        setAccountId((current) => current || retained?.id || '');
      })
      .catch((err) => showApiError(err, 'Could not load equity accounts'));
  }, [year]);

  const minDate = year?.startDate.slice(0, 10) || '';
  const maxDate = year?.endDate.slice(0, 10) || '';
  const effectiveDate = closingDate || maxDate;

  const close = async () => {
    if (!year) return;
    if (!accountId) return showApiError(new Error('Choose the retained earnings account'));
    setBusy(true);
    try {
      const created = await api.post('/accounting/period-closing-vouchers', { fiscalYearId: year.id, retainedEarningsAccountId: accountId, postingDate: effectiveDate, remarks: remarks || undefined });
      const voucherId = created.data?.data?.id;
      await api.put(`/accounting/period-closing-vouchers/${voucherId}/submit`);
      showApiSuccess(`${year.name} closed. Its result was moved to retained earnings and the year is locked.`);
      onOpenChange(false);
      onClosed();
    } catch (err) {
      showApiError(err, `Could not close ${year.name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!year} onOpenChange={(open) => { if (!busy) onOpenChange(open); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Close {year?.name}</DialogTitle>
          <DialogDescription>
            Moves this year&apos;s income and expense balances into retained earnings with a period closing voucher, then locks the year so nothing more can be posted to it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Retained earnings account *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder={accounts.length ? 'Choose an equity account' : 'No equity accounts found'} /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!accounts.length && <p className="text-xs text-amber-700">Create an EQUITY account such as &quot;Retained Earnings&quot; in the Chart of Accounts first.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Closing date</Label>
            <Input type="date" min={minDate} max={maxDate} value={effectiveDate} onChange={(e) => setClosingDate(e.target.value)} />
            <p className="text-xs text-[#6b7280]">Normally the last day of the year.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            After closing, the year and all its periods are locked. Check the Trial Balance and P&amp;L for the year before you continue.
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || !accountId} onClick={() => void close()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Close year
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
