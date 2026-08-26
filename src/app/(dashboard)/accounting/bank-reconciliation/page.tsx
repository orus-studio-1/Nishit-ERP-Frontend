'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { Account } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [gl, setGl] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reconcilingLineId, setReconcilingLineId] = useState<string | null>(null);
  const [form, setForm] = useState({
    accountId: '',
    statementDate: new Date().toISOString().slice(0, 10),
    description: '',
    debit: '',
    credit: '',
    reference: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const [a, l, g] = await Promise.all([
        api.get('/accounting/accounts'),
        api.get('/accounting/bank-statement-lines'),
        api.get('/accounting/gl-entries', { params: { limit: 100 } }),
      ]);
      setAccounts(a.data?.data || []);
      setLines(l.data?.data || []);
      setGl(g.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load reconciliation data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (isSubmitting) return;

    if (!form.accountId) {
      toast.error('Please select a bank account');
      return;
    }
    if (!form.statementDate) {
      toast.error('Please enter a statement date');
      return;
    }
    const debitNum = Number(form.debit || 0);
    const creditNum = Number(form.credit || 0);
    if (debitNum <= 0 && creditNum <= 0) {
      toast.error('Please specify a debit or credit amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/accounting/bank-statement-lines', {
        ...form,
        debit: debitNum,
        credit: creditNum,
      });
      showApiSuccess('Statement line added successfully');
      setForm({
        accountId: form.accountId,
        statementDate: new Date().toISOString().slice(0, 10),
        description: '',
        debit: '',
        credit: '',
        reference: '',
      });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to add statement line');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reconcile = async (lineId: string, ledgerEntryId: string) => {
    if (reconcilingLineId) return;
    setReconcilingLineId(lineId);
    try {
      await api.put(`/accounting/bank-statement-lines/${lineId}/reconcile`, { ledgerEntryId });
      showApiSuccess('Statement line reconciled successfully');
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to reconcile statement line');
    } finally {
      setReconcilingLineId(null);
    }
  };

  const bankAccounts = accounts.filter((a) => a.isActive && !a.isGroup);
  const openGlEntries = gl.filter((e) => e.reconciliationStatus !== 'RECONCILED');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Reconciliation"
        description="Match bank statement lines against bank and cash General Ledger entries"
      />

      {bankAccounts.length === 0 && !isLoading && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>No bank or cash accounts found in Chart of Accounts.</span>
          </div>
          <Link
            href="/accounting/accounts"
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 text-xs"
          >
            <span>Create Account</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="grid gap-3 rounded-md border border-[#e5e2dc] bg-white p-4 md:grid-cols-6 shadow-xs">
        <div>
          <Label>Account *</Label>
          <Select value={form.accountId} onValueChange={(accountId) => setForm((f) => ({ ...f, accountId }))}>
            <SelectTrigger>
              <SelectValue placeholder="Bank account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.length === 0 ? (
                <SelectEmptyState
                  message="No accounts found"
                  linkHref="/accounting/accounts"
                  linkText="Create Account"
                />
              ) : (
                bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            type="date"
            value={form.statementDate}
            onChange={(e) => setForm((f) => ({ ...f, statementDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={form.description}
            placeholder="e.g. Deposit / Wire"
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <Label>Debit (Receipt)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={form.debit}
            onChange={(e) => setForm((f) => ({ ...f, debit: e.target.value }))}
          />
        </div>
        <div>
          <Label>Credit (Payment)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={form.credit}
            onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={create} disabled={isSubmitting || bankAccounts.length === 0} className="w-full">
            {isSubmitting ? 'Adding...' : 'Add Line'}
          </Button>
        </div>
      </div>

      {lines.length === 0 && !isLoading ? (
        <EmptyState
          icon={ShieldCheck}
          title="No statement lines"
          description="Add bank statement lines above to match them with ledger entries and reconcile your accounts."
        />
      ) : (
        <DataTable
          data={lines}
          isLoading={isLoading}
          columns={[
            { key: 'date', header: 'Date', render: (r: any) => formatDate(r.statementDate) },
            { key: 'account', header: 'Account', render: (r: any) => r.account?.name || '—' },
            { key: 'description', header: 'Description', render: (r: any) => r.description || '—' },
            {
              key: 'amount',
              header: 'Amount',
              render: (r: any) => formatCurrency(Number(r.debit || 0) - Number(r.credit || 0)),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: any) => (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.isReconciled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.isReconciled ? 'Reconciled' : 'Open'}
                </span>
              ),
            },
            {
              key: 'match',
              header: 'Match GL',
              render: (r: any) =>
                r.isReconciled ? (
                  <span className="text-xs text-gray-400">Reconciled</span>
                ) : (
                  <Select
                    disabled={reconcilingLineId === r.id}
                    onValueChange={(id) => reconcile(r.id, id)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={reconcilingLineId === r.id ? 'Reconciling...' : 'Select GL Entry'} />
                    </SelectTrigger>
                    <SelectContent>
                      {openGlEntries.length === 0 ? (
                        <SelectEmptyState
                          message="No open GL entries"
                          linkHref="/accounting/journal-entries"
                          linkText="Create Entry"
                        />
                      ) : (
                        openGlEntries.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {formatDate(e.postingDate)} {e.account?.name}{' '}
                            {formatCurrency(Number(e.debitBase || 0) - Number(e.creditBase || 0))}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
