'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, History, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuditFieldGrid } from '@/components/shared/AuditFieldGrid';
import { useAuditTrail, type Actor } from '@/hooks/useAuditTrail';

type AuditRow = { id: string; entityType: string; entityId?: string; action: string; before?: unknown; diff?: unknown; after?: unknown; ip?: string; userAgent?: string; requestId?: string; createdAt: string; actor?: Actor | null };

const modules = ['ACCESS', 'ACCOUNTING', 'CRM', 'CUSTOMERS', 'HR', 'INVENTORY', 'INVOICING', 'PROCUREMENT', 'PROJECTS', 'SALES', 'SUPPLIERS'];
const actions = ['CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'CANCEL', 'AMEND', 'APPROVE', 'REJECT', 'CONVERT', 'COMPLETE', 'DISPATCH', 'RECEIVE'];
const actorName = (actor?: Actor | null) => actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'System';

function AuditTrailContent() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [filters, setFilters] = useState({ module: '', action: '', userId: '', from: '', to: '', entityId: '' });
  const { items: rows, users, loading, page, setPage, total, totalPages, load, limit } = useAuditTrail<AuditRow>('/platform/audit', filters, 'Could not load the organization audit trail');

  useEffect(() => {
    const moduleName = searchParams.get('module');
    setPage(1);
    setFilters(current => ({ ...current, module: moduleName?.toUpperCase() || '' }));
  }, [searchParams, setPage]);

  const setFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters(current => ({ ...current, [key]: value === 'ALL' ? '' : value })); };

  const columns = [
    { key: 'createdAt', header: 'Date & Time', render: (row: AuditRow) => <div><p className="font-medium">{new Date(row.createdAt).toLocaleDateString()}</p><p className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleTimeString()}</p></div> },
    { key: 'actor', header: 'Changed By', render: (row: AuditRow) => <div><p className="font-medium text-gray-900">{actorName(row.actor)}</p><p className="text-xs text-gray-500">{row.actor?.employee?.employeeId || row.actor?.email || 'Automated process'}{row.actor?.role ? ` · ${row.actor.role}` : ''}</p></div> },
    { key: 'module', header: 'Module / Record', render: (row: AuditRow) => { const [moduleName, resource] = row.entityType.split(':'); return <div><p className="font-medium capitalize">{moduleName.toLowerCase()} · {(resource || '').toLowerCase().replaceAll('-', ' ')}</p><p className="max-w-48 truncate font-mono text-xs text-gray-500" title={row.entityId}>{row.entityId || 'Multiple records'}</p></div>; } },
    { key: 'action', header: 'Action', render: (row: AuditRow) => <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{row.action}</span> },
    { key: 'ip', header: 'IP Address', render: (row: AuditRow) => <span className="font-mono text-xs">{row.ip || '—'}</span> },
    { key: 'details', header: '', render: (row: AuditRow) => <Button size="sm" variant="outline" onClick={() => setSelected(row)}><Eye className="mr-1 h-3.5 w-3.5" />Details</Button> },
  ];

  return <div>
    <PageHeader title="Organization Audit Trail" description="See who created, edited, submitted or cancelled records across Nishit ERP">
      <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    </PageHeader>
    <div className="mb-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="space-y-1"><Label>Module</Label><Select value={filters.module || 'ALL'} onValueChange={value => setFilter('module', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All modules</SelectItem>{modules.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Action</Label><Select value={filters.action || 'ALL'} onValueChange={value => setFilter('action', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All actions</SelectItem>{actions.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Employee</Label><Select value={filters.userId || 'ALL'} onValueChange={value => setFilter('userId', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All employees</SelectItem>{users.map(user => <SelectItem key={user.id} value={user.id}>{actorName(user)} · {user.email}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>From</Label><Input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)} /></div>
      <div className="space-y-1"><Label>To</Label><Input type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)} /></div>
      <div className="space-y-1"><Label>Record ID</Label><Input placeholder="Exact record ID" value={filters.entityId} onChange={event => setFilter('entityId', event.target.value)} /></div>
    </div>
    {!rows.length && !loading ? <EmptyState icon={History} title="No audit activity found" description="Successful changes made by employees will appear here. Try clearing the filters if activity already exists." /> : <><DataTable data={rows} columns={columns} isLoading={loading} />{total > limit && <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />}</>}
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Audit Event Details</DialogTitle></DialogHeader>{selected && <div className="space-y-4 text-sm"><div className="grid gap-3 rounded-lg border bg-gray-50 p-4 sm:grid-cols-2"><p><span className="text-gray-500">Employee:</span> {actorName(selected.actor)} ({selected.actor?.email || 'system'})</p><p><span className="text-gray-500">Action:</span> {selected.action}</p><p><span className="text-gray-500">Record:</span> {selected.entityType} · {selected.entityId || 'multiple'}</p><p><span className="text-gray-500">Time:</span> {new Date(selected.createdAt).toLocaleString()}</p><p><span className="text-gray-500">IP:</span> {selected.ip || '—'}</p><p><span className="text-gray-500">Request ID:</span> <span className="font-mono text-xs">{selected.requestId || '—'}</span></p></div>{selected.before != null && <div><Label>Previous values</Label><AuditFieldGrid value={selected.before} /></div>}<div><Label>Fields submitted / changed</Label><AuditFieldGrid value={selected.diff} /></div><div><Label>Saved result</Label><AuditFieldGrid value={selected.after} /></div></div>}</DialogContent></Dialog>
  </div>;
}

export default function AuditTrailPage() {
  return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading audit trail…</div>}><AuditTrailContent /></Suspense>;
}
