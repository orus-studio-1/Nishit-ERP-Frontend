'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, WalletCards } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ fiscalYearId: '', accountId: '', amount: '' });

  const load = async () => {
    setIsLoading(true);
    try {
      const [b, a, y] = await Promise.all([
        api.get('/accounting/budgets'),
        api.get('/accounting/accounts'),
        api.get('/accounting/fiscal-years'),
      ]);
      setBudgets(b.data?.data || []);
      setAccounts(a.data?.data || []);
      setYears(y.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (isSubmitting) return;

    if (!form.fiscalYearId) {
      toast.error('Please select a fiscal year');
      return;
    }
    if (!form.accountId) {
      toast.error('Please select an account');
      return;
    }
    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a budget amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/accounting/budgets', { ...form, amount: amountNum });
      showApiSuccess('Budget created successfully');
      setForm({ fiscalYearId: '', accountId: '', amount: '' });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAccounts = accounts.filter((a) => a.isActive && !a.isGroup);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Budgets"
        description="Budget versus actual control by account and fiscal year"
      />

      {/* Warning banner if prerequisite resources are missing */}
      {(!isLoading && (years.length === 0 || activeAccounts.length === 0)) && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {years.length === 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No fiscal years found. Create a fiscal year to set budgets.</span>
              </div>
              <Link
                href="/accounting/fiscal-years"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 text-xs"
              >
                <span>Create Fiscal Year</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
          {activeAccounts.length === 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No ledger accounts found. Set up accounts in Chart of Accounts first.</span>
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
        </div>
      )}

      <div className="grid gap-3 rounded-md border border-[#e5e2dc] bg-white p-4 md:grid-cols-4 shadow-xs">
        <div>
          <Label>Fiscal Year *</Label>
          <Select
            value={form.fiscalYearId}
            onValueChange={(fiscalYearId) => setForm((f) => ({ ...f, fiscalYearId }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.length === 0 ? (
                <SelectEmptyState
                  message="No fiscal years found"
                  linkHref="/accounting/fiscal-years"
                  linkText="Create Fiscal Year"
                />
              ) : (
                years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Account *</Label>
          <Select
            value={form.accountId}
            onValueChange={(accountId) => setForm((f) => ({ ...f, accountId }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.length === 0 ? (
                <SelectEmptyState
                  message="No accounts found"
                  linkHref="/accounting/accounts"
                  linkText="Create Account"
                />
              ) : (
                activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount *</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={create}
            disabled={isSubmitting || years.length === 0 || activeAccounts.length === 0}
            className="w-full"
          >
            {isSubmitting ? 'Creating...' : 'Create Budget'}
          </Button>
        </div>
      </div>

      {budgets.length === 0 && !isLoading ? (
        <EmptyState
          icon={WalletCards}
          title="No budgets configured"
          description="Allocate budget limits to your accounts by fiscal year for variance tracking."
        />
      ) : (
        <DataTable
          data={budgets}
          isLoading={isLoading}
          columns={[
            {
              key: 'year',
              header: 'Fiscal Year',
              render: (row: any) => row.fiscalYear?.name || row.fiscalYearId,
            },
            {
              key: 'account',
              header: 'Account',
              render: (row: any) =>
                row.account ? `${row.account.code} - ${row.account.name}` : row.accountId,
            },
            {
              key: 'amount',
              header: 'Budget Amount',
              render: (row: any) => formatCurrency(row.amount),
            },
          ]}
        />
      )}
    </div>
  );
}
