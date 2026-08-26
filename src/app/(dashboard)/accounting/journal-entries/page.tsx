'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { JournalEntry, Account } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

interface JournalLineForm {
  debitAccountId: string;
  creditAccountId: string;
  debit: number;
  credit: number;
  description: string;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
  });
  const [lines, setLines] = useState<JournalLineForm[]>([
    { debitAccountId: '', creditAccountId: '', debit: 0, credit: 0, description: '' },
  ]);

  const limit = 20;
  const postingAccounts = accounts.filter((account) => account.isActive && !account.isGroup);
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [entRes, accRes] = await Promise.all([
        api.get('/accounting/journal-entries', { params: { page, limit } }),
        api.get('/accounting/accounts'),
      ]);
      setEntries(entRes.data?.data?.items || []);
      setTotal(entRes.data?.data?.total || 0);
      setAccounts(accRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load journal entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.date) {
      toast.error('Please select an entry date');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Please enter an entry description');
      return;
    }
    if (postingAccounts.length === 0) {
      toast.error('No accounts available. Please create accounts first.');
      return;
    }
    if (!lines.length) {
      toast.error('Please add at least one journal line');
      return;
    }

    // Line by line validation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);
      if (d <= 0 && c <= 0) {
        toast.error(`Line ${i + 1}: Please enter a debit or credit amount`);
        return;
      }
      if (d > 0 && !line.debitAccountId) {
        toast.error(`Line ${i + 1}: Please select a debit account`);
        return;
      }
      if (c > 0 && !line.creditAccountId) {
        toast.error(`Line ${i + 1}: Please select a credit account`);
        return;
      }
    }

    if (totalDebit <= 0) {
      toast.error('Journal entry amount must be greater than zero');
      return;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.000001) {
      toast.error(
        `Total debit (${formatCurrency(totalDebit)}) must equal total credit (${formatCurrency(totalCredit)})`
      );
      return;
    }

    const cleanLines = lines
      .filter((line) => Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0)
      .map((line) => ({
        debitAccountId: line.debitAccountId || undefined,
        creditAccountId: line.creditAccountId || undefined,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        description: line.description || undefined,
      }));

    setIsSubmitting(true);
    try {
      await api.post('/accounting/journal-entries', { ...form, lines: cleanLines });
      showApiSuccess('Journal entry created successfully');
      setShowModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '' });
      setLines([{ debitAccountId: '', creditAccountId: '', debit: 0, credit: 0, description: '' }]);
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to create journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async (id: string) => {
    if (postingId) return;
    setPostingId(id);
    try {
      await api.put(`/accounting/journal-entries/${id}/post`);
      showApiSuccess('Journal entry posted to General Ledger');
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to post journal entry');
    } finally {
      setPostingId(null);
    }
  };

  const columns = [
    {
      key: 'entryNumber',
      header: 'Entry #',
      render: (e: JournalEntry) => <span className="font-mono text-sm font-semibold">{e.entryNumber}</span>,
    },
    { key: 'date', header: 'Date', render: (e: JournalEntry) => formatDate(e.date) },
    { key: 'description', header: 'Description' },
    { key: 'totalDebit', header: 'Debit', render: (e: JournalEntry) => formatCurrency(e.totalDebit) },
    { key: 'totalCredit', header: 'Credit', render: (e: JournalEntry) => formatCurrency(e.totalCredit) },
    { key: 'status', header: 'Status', render: (e: JournalEntry) => <StatusBadge status={e.status} /> },
    {
      key: 'actions',
      header: '',
      render: (e: JournalEntry) =>
        e.status === 'DRAFT' ? (
          <Button
            size="sm"
            disabled={postingId === e.id}
            onClick={(ev) => {
              ev.stopPropagation();
              handlePost(e.id);
            }}
          >
            {postingId === e.id ? 'Posting...' : 'Post'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        description="Manage accounting journal entries"
        action={{ label: 'New Entry', onClick: () => setShowModal(true), icon: Plus }}
      />
      {entries.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No journal entries"
          description="Start recording financial transactions and balancing debits and credits."
          action={{ label: 'New Entry', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={entries} isLoading={isLoading} />
          {total > limit && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>

          {postingAccounts.length === 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No ledger accounts found. You must create accounts before making journal entries.</span>
              </div>
              <Link
                href="/accounting/accounts"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 text-xs"
              >
                <span>Create Accounts</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="e.g. INV-1002, Receipt #45"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  placeholder="e.g. Office rent payment for August"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLines([
                      ...lines,
                      { debitAccountId: '', creditAccountId: '', debit: 0, credit: 0, description: '' },
                    ])
                  }
                >
                  + Add Line
                </Button>
              </div>

              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-3">
                    <Select
                      value={line.debitAccountId}
                      onValueChange={(v) => {
                        const l = [...lines];
                        l[idx].debitAccountId = v;
                        setLines(l);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Debit Acct" />
                      </SelectTrigger>
                      <SelectContent>
                        {postingAccounts.length === 0 ? (
                          <SelectEmptyState
                            message="No accounts found"
                            linkHref="/accounting/accounts"
                            linkText="Create one"
                          />
                        ) : (
                          postingAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3">
                    <Select
                      value={line.creditAccountId}
                      onValueChange={(v) => {
                        const l = [...lines];
                        l[idx].creditAccountId = v;
                        setLines(l);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Credit Acct" />
                      </SelectTrigger>
                      <SelectContent>
                        {postingAccounts.length === 0 ? (
                          <SelectEmptyState
                            message="No accounts found"
                            linkHref="/accounting/accounts"
                            linkText="Create one"
                          />
                        ) : (
                          postingAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) => {
                        const l = [...lines];
                        l[idx].debit = Number(e.target.value);
                        setLines(l);
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      placeholder="Credit"
                      value={line.credit}
                      onChange={(e) => {
                        const l = [...lines];
                        l[idx].credit = Number(e.target.value);
                        setLines(l);
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Note"
                      value={line.description}
                      onChange={(e) => {
                        const l = [...lines];
                        l[idx].description = e.target.value;
                        setLines(l);
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-sm mt-2 font-medium">
                <span className="text-gray-600">
                  Total Debit: <strong>{formatCurrency(totalDebit)}</strong>
                </span>
                <span className="text-gray-600">
                  Total Credit: <strong>{formatCurrency(totalCredit)}</strong>
                </span>
              </div>

              {postingAccounts.length === 0 && (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Create at least two non-group accounts before creating a journal entry.
                </p>
              )}
              {totalDebit > 0 && Math.abs(totalDebit - totalCredit) > 0.000001 && (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
                  Debit and credit totals must match before this entry can be created (Difference:{' '}
                  {formatCurrency(Math.abs(totalDebit - totalCredit))}).
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || postingAccounts.length === 0}>
                {isSubmitting ? 'Creating...' : 'Create Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
