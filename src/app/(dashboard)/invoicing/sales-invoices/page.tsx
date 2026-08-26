'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, FileText, Filter, ListFilter, PackagePlus, Plus, Search, X } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { InvoiceStatus, SalesInvoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';
import toast from 'react-hot-toast';

const statuses: Array<{ label: string; value: '' | InvoiceStatus }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

type UserOption = { id: string; email: string; firstName: string; lastName: string };
type SavedFilter = '' | 'not_cancelled' | 'outstanding';

const savedFilters: Array<{ label: string; value: SavedFilter }> = [
  { label: 'Status is Not Cancelled', value: 'not_cancelled' },
  { label: 'Outstanding > 0', value: 'outstanding' },
];

function userLabel(user?: UserOption | null) {
  if (!user) return '-';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.email;
}

function readPagination(payload: any) {
  if (payload?.data?.items) return payload.data;
  if (Array.isArray(payload?.data)) {
    return {
      items: payload.data,
      total: payload.pagination?.total || payload.data.length,
      page: payload.pagination?.page || 1,
      limit: payload.pagination?.limit || 20,
      totalPages: payload.pagination?.totalPages || 1,
    };
  }
  return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
}

function invoiceTotal(invoice: SalesInvoice) {
  return Number(invoice.grandTotal ?? invoice.total ?? 0);
}

function invoiceOutstanding(invoice: SalesInvoice) {
  return Number(invoice.outstandingAmount ?? invoiceTotal(invoice) - Number(invoice.amountPaid || 0));
}

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | InvoiceStatus>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = useState('ALL');
  const [createdByFilter, setCreatedByFilter] = useState('ALL');
  const [createdOn, setCreatedOn] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTaggedOnly, setShowTaggedOnly] = useState(false);
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('');
  const limit = 20;

  const hasActiveFilters = Boolean(search || status || assignedFilter !== 'ALL' || createdByFilter !== 'ALL' || createdOn || tagFilter || showTaggedOnly || savedFilter);

  useEffect(() => {
    api.get('/invoices/filter-options')
      .then(res => {
        setUsers(res.data?.data?.users || []);
        setKnownTags(res.data?.data?.tags || []);
      })
      .catch(() => {
        setUsers([]);
        setKnownTags([]);
      });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/invoices', {
          params: {
            page,
            limit,
            search: search || undefined,
            status: status || undefined,
            createdOn: createdOn || undefined,
            assignedTo: assignedFilter === 'ME' ? 'me' : assignedFilter === 'UNASSIGNED' ? 'unassigned' : undefined,
            assignedToId: assignedFilter !== 'ALL' && assignedFilter !== 'ME' && assignedFilter !== 'UNASSIGNED' ? assignedFilter : undefined,
            createdBy: createdByFilter === 'ME' ? 'me' : undefined,
            createdById: createdByFilter !== 'ALL' && createdByFilter !== 'ME' ? createdByFilter : undefined,
            tag: tagFilter || undefined,
            hasTags: showTaggedOnly ? 'true' : undefined,
            savedFilter: savedFilter || undefined,
          },
        });
        const paged = readPagination(res.data);
        setInvoices(paged.items);
        setTotal(paged.total);
        setTotalPages(paged.totalPages);
      } catch (err: any) {
        showApiError(err, 'Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [page, search, status, assignedFilter, createdByFilter, createdOn, tagFilter, showTaggedOnly, savedFilter]);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setAssignedFilter('ALL');
    setCreatedByFilter('ALL');
    setCreatedOn('');
    setTagFilter('');
    setShowTaggedOnly(false);
    setSavedFilter('');
    setPage(1);
  }

  return (
    <div className="min-h-[calc(100vh-92px)]">
      <div className="mb-3 flex items-center justify-between border-b border-[#e5e2dc] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f1f5f7] text-[#4b5563]">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1f2937]">Sales Invoice</h1>
            <p className="text-xs text-[#7c8591]">List View · Accounts Receivable</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/orders">
              <PackagePlus className="mr-2 h-4 w-4" />
              Get from
            </Link>
          </Button>
          <Button asChild>
            <Link href="/invoicing/sales-invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Sales Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[72px] space-y-5 border-r border-[#e5e2dc] pr-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[#7c8591]">
                <ListFilter className="h-3.5 w-3.5" />
                Views
              </p>
              <div className="space-y-1">
                <button className="w-full rounded-md bg-[#eef6fd] px-2.5 py-1.5 text-left text-sm font-medium text-[#1674c4]">List View</button>
                <Link href="/invoicing/reports/aging" className="block rounded-md px-2.5 py-1.5 text-sm text-[#4b5563] hover:bg-[#f4f5f6]">Aging Report</Link>
                <Link href="/invoicing/reports/outstanding" className="block rounded-md px-2.5 py-1.5 text-sm text-[#4b5563] hover:bg-[#f4f5f6]">Outstanding</Link>
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[#7c8591]">
                <Filter className="h-3.5 w-3.5" />
                Filter By
              </p>
              <div className="space-y-2">
                <FilterSelect label="Assigned To" value={assignedFilter} onChange={(value) => { setAssignedFilter(value); setPage(1); }}>
                  <SelectItem value="ALL">All users</SelectItem>
                  <SelectItem value="ME">Me</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {users.map(user => <SelectItem key={user.id} value={user.id}>{userLabel(user)}</SelectItem>)}
                </FilterSelect>
                <FilterSelect label="Created By" value={createdByFilter} onChange={(value) => { setCreatedByFilter(value); setPage(1); }}>
                  <SelectItem value="ALL">All users</SelectItem>
                  <SelectItem value="ME">Me</SelectItem>
                  {users.map(user => <SelectItem key={user.id} value={user.id}>{userLabel(user)}</SelectItem>)}
                </FilterSelect>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6b7280]">Tags</label>
                  <Input
                    list="invoice-tags"
                    value={tagFilter}
                    onChange={event => {
                      setTagFilter(event.target.value.trim());
                      setPage(1);
                    }}
                    placeholder="Filter by tag"
                    className="h-8 text-xs"
                  />
                  <datalist id="invoice-tags">{knownTags.map(tag => <option key={tag} value={tag} />)}</datalist>
                  <button
                    className={showTaggedOnly ? 'rounded-md bg-[#eef6fd] px-2 py-1 text-xs font-medium text-[#1674c4]' : 'rounded-md bg-[#f4f5f6] px-2 py-1 text-xs font-medium text-[#4b5563]'}
                    onClick={() => {
                      setShowTaggedOnly(prev => !prev);
                      setPage(1);
                    }}
                  >
                    Show tagged only
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[#7c8591]">Saved Filters</p>
              <div className="space-y-1.5">
                {savedFilters.map(item => (
                  <button
                    key={item.value}
                    className={savedFilter === item.value ? 'rounded-md bg-[#eef6fd] px-2 py-1 text-xs font-medium text-[#1674c4]' : 'rounded-md bg-[#f4f5f6] px-2 py-1 text-xs font-medium text-[#4b5563]'}
                    onClick={() => {
                      setSavedFilter(prev => prev === item.value ? '' : item.value);
                      setPage(1);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className="rounded-md border border-[#e5e2dc] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="border-b border-[#e5e2dc] p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative max-w-xl flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3af]" />
                  <Input
                    className="bg-[#f8faf9] pl-8"
                    placeholder="Search by invoice ID, title, or customer"
                    value={search}
                    onChange={event => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#6b7280]">
                  <div className="flex h-9 w-full min-w-0 max-w-[160px] items-center gap-1.5 rounded-md border border-[#e5e2dc] bg-white px-2 sm:w-[150px]">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                    <Input
                      type="date"
                      value={createdOn}
                      onChange={event => {
                        setCreatedOn(event.target.value);
                        setPage(1);
                      }}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:h-3.5 [&::-webkit-calendar-picker-indicator]:w-3.5"
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <X className="mr-2 h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {statuses.map(tab => (
                  <button
                    key={tab.label}
                    className={status === tab.value ? 'rounded-md bg-[#2490ef] px-2.5 py-1.5 text-xs font-medium text-white' : 'rounded-md border border-[#e5e2dc] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4b5563] hover:bg-[#f8faf9]'}
                    onClick={() => {
                      setStatus(tab.value);
                      setPage(1);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {invoices.length === 0 && !isLoading ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create a draft invoice or pull one from a submitted sales order."
                action={{ label: 'New Invoice', onClick: () => { window.location.href = '/invoicing/sales-invoices/new'; } }}
              />
            ) : (
              <>
                <InvoiceDeskTable invoices={invoices} isLoading={isLoading} />
                {total > limit && <div className="border-t border-[#f0ede8] px-3 py-2"><Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} /></div>}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#6b7280]">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function InvoiceDeskTable({ invoices, isLoading }: { invoices: SalesInvoice[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="divide-y divide-[#f0ede8]">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-12 animate-pulse bg-[#f8faf9]" />)}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-sm">
        <thead className="border-b border-[#e5e2dc] bg-[#fbfaf8] text-xs font-medium text-[#6b7280]">
          <tr>
            <th className="w-10 px-3 py-2 text-left"><input type="checkbox" className="h-3.5 w-3.5 rounded border-[#d9d4cc]" /></th>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Grand Total</th>
            <th className="px-3 py-2 text-right">Paid</th>
            <th className="px-3 py-2 text-right">Outstanding</th>
            <th className="px-3 py-2 text-left">Due Date</th>
            <th className="px-3 py-2 text-left">ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0ede8] bg-white">
          {invoices.map(invoice => (
            <tr key={invoice.id} className="cursor-pointer hover:bg-[#f8faf9]" onClick={() => { window.location.href = `/invoicing/sales-invoices/${invoice.id}`; }}>
              <td className="px-3 py-2"><input type="checkbox" className="h-3.5 w-3.5 rounded border-[#d9d4cc]" onClick={event => event.stopPropagation()} /></td>
              <td className="px-3 py-2">
                <Link href={`/invoicing/sales-invoices/${invoice.id}`} className="font-medium text-[#1f2937] hover:text-[#1674c4]">
                  {invoice.customer?.name || invoice.invoiceNo}
                </Link>
                <div className="text-xs text-[#8a929d]">{formatDate(invoice.date)}</div>
                {!!invoice.tags?.length && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {invoice.tags.slice(0, 3).map(tag => <span key={tag} className="rounded bg-[#f4f5f6] px-1.5 py-0.5 text-[10px] text-[#6b7280]">{tag}</span>)}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-[#374151]">{invoice.customer?.name || '-'}</td>
              <td className="px-3 py-2"><StatusBadge status={invoice.status} /></td>
              <td className="px-3 py-2 text-right font-medium">{formatCurrency(invoiceTotal(invoice), invoice.currency)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(Number(invoice.amountPaid || 0), invoice.currency)}</td>
              <td className="px-3 py-2 text-right font-semibold text-[#c3423f]">{formatCurrency(invoiceOutstanding(invoice), invoice.currency)}</td>
              <td className="px-3 py-2 text-[#6b7280]">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
              <td className="px-3 py-2 font-mono text-xs text-[#1674c4]">{invoice.invoiceNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
