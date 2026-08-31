'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Database, Eye, History, RefreshCw, Users } from 'lucide-react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Actor = { id: string; firstName?: string; lastName?: string; email: string; role?: string; employee?: { employeeId?: string } };
type Event = { id: string; layer: 'BUSINESS_EVENT' | 'RECORD_CHANGE'; documentType: string; entityId?: string; action: string; actor?: Actor | null; before?: unknown; changes?: unknown; after?: unknown; message?: string; ip?: string; userAgent?: string; requestId?: string; createdAt: string };
type ResponseData = { items: Event[]; total: number; totalPages: number; users: Actor[]; coverage: { businessEvents: number; recordChanges: number } };

const documents = ['MATERIAL_REQUEST', 'RFQ', 'SUPPLIER_QUOTATION', 'BLANKET_PURCHASE_ORDER', 'PURCHASE_ORDER', 'GATE_ENTRY', 'PURCHASE_RECEIPT', 'QUALITY_INSPECTION', 'PURCHASE_RETURN', 'LANDED_COST_VOUCHER', 'PURCHASE_INVOICE', 'THREE_WAY_MATCH', 'SUPPLIER_PAYMENT', 'COMMUNICATION', 'PAYMENT_TERMS', 'SUPPLIER_ITEM', 'BUYING_SETTINGS', 'VENDOR_RATING'];
const actions = ['CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'CANCEL', 'APPROVE', 'REJECT', 'SEND', 'CLOSE', 'COMPLETE', 'DISPATCH', 'RECEIVE', 'STATUS_SUBMITTED', 'STATUS_CONFIRMED', 'STATUS_CANCELLED', 'CREATE_RFQ', 'STOCK_TRANSFER', 'SELECTIONS', 'GENERATE_PURCHASE_ORDERS', 'PURCHASE_ORDER', 'REVISE', 'MATCH', 'APPROVE_EXCEPTION', 'VENDOR_SELECTION', 'VENDOR_ACKNOWLEDGED', 'VENDOR_DECLINED'];
const actorName = (actor?: Actor | null) => actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email : 'Supplier / System';
const human = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const json = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

export default function ProcurementAuditTrailPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<Actor[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [coverage, setCoverage] = useState({ businessEvents: 0, recordChanges: 0 });
  const [filters, setFilters] = useState({ layer: '', documentType: '', action: '', userId: '', from: '', to: '', entityId: '' });
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) };
      const response = await api.get('/procurement/audit-trail', { params });
      const data: ResponseData = response.data?.data || {};
      setEvents(data.items || []); setUsers(data.users || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1); setCoverage(data.coverage || { businessEvents: 0, recordChanges: 0 });
    } catch (error) { showApiError(error, 'Could not load procurement audit trail'); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { load(); }, [load]);
  const filter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters(current => ({ ...current, [key]: value === 'ALL' ? '' : value })); };
  const activeEmployees = useMemo(() => new Set(events.map(event => event.actor?.id).filter(Boolean)).size, [events]);

  const columns = [
    { key: 'createdAt', header: 'When', render: (event: Event) => <div><p className="font-medium">{new Date(event.createdAt).toLocaleDateString()}</p><p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleTimeString()}</p></div> },
    { key: 'actor', header: 'Who', render: (event: Event) => <div><p className="font-medium text-gray-900">{actorName(event.actor)}</p><p className="text-xs text-gray-500">{event.actor?.employee?.employeeId || event.actor?.email || 'External acknowledgement'}{event.actor?.role ? ` · ${event.actor.role}` : ''}</p></div> },
    { key: 'document', header: 'Document', render: (event: Event) => <div><p className="font-medium">{human(event.documentType)}</p><p className="max-w-52 truncate font-mono text-xs text-gray-500" title={event.entityId}>{event.entityId || 'Multiple records'}</p></div> },
    { key: 'action', header: 'Action', render: (event: Event) => <div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{human(event.action)}</span>{event.message && <p className="mt-1 max-w-72 truncate text-xs text-gray-500" title={event.message}>{event.message}</p>}</div> },
    { key: 'layer', header: 'Evidence', render: (event: Event) => <span className={`rounded px-2 py-1 text-xs font-medium ${event.layer === 'BUSINESS_EVENT' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{event.layer === 'BUSINESS_EVENT' ? 'Business event' : 'Record change'}</span> },
    { key: 'details', header: '', render: (event: Event) => <Button size="sm" variant="outline" onClick={() => setSelected(event)}><Eye className="mr-1 h-3.5 w-3.5" />Inspect</Button> },
  ];

  return <div>
    <PageHeader title="Procurement Audit Trail" description="Complete evidence of request-to-pay changes, approvals, supplier responses, receipts, inspections, invoices and payments">
      <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    </PageHeader>
    <div className="mb-4 grid gap-3 md:grid-cols-4">
      <Metric icon={History} label="Filtered events" value={total} />
      <Metric icon={Activity} label="Business events" value={coverage.businessEvents} />
      <Metric icon={Database} label="Record changes" value={coverage.recordChanges} />
      <Metric icon={Users} label="Employees on page" value={activeEmployees} />
    </div>
    <div className="mb-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4 xl:grid-cols-7">
      <FilterSelect label="Evidence" value={filters.layer} options={[['BUSINESS_EVENT', 'Business events'], ['RECORD_CHANGE', 'Record changes']]} onChange={value => filter('layer', value)} />
      <FilterSelect label="Document" value={filters.documentType} options={documents.map(value => [value, human(value)])} onChange={value => filter('documentType', value)} />
      <FilterSelect label="Action" value={filters.action} options={actions.map(value => [value, human(value)])} onChange={value => filter('action', value)} />
      <div className="space-y-1"><Label>Employee</Label><Select value={filters.userId || 'ALL'} onValueChange={value => filter('userId', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All employees</SelectItem>{users.map(user => <SelectItem key={user.id} value={user.id}>{actorName(user)} · {user.email}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>From</Label><Input type="date" value={filters.from} onChange={event => filter('from', event.target.value)} /></div>
      <div className="space-y-1"><Label>To</Label><Input type="date" value={filters.to} onChange={event => filter('to', event.target.value)} /></div>
      <div className="space-y-1"><Label>Record ID</Label><Input placeholder="Exact document ID" value={filters.entityId} onChange={event => filter('entityId', event.target.value)} /></div>
    </div>
    {!events.length && !loading ? <EmptyState icon={History} title="No procurement activity found" description="Successful procurement changes and business events appear here. Clear filters if activity already exists." /> : <><DataTable data={events} columns={columns} isLoading={loading} />{total > limit && <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />}</>}
    <EventDialog event={selected} onClose={() => setSelected(null)} />
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 p-4"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">{value.toLocaleString()}</p><p className="text-xs text-gray-500">{label}</p></div></CardContent></Card>; }
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <div className="space-y-1"><Label>{label}</Label><Select value={value || 'ALL'} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All</SelectItem>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>; }

function EventDialog({ event, onClose }: { event: Event | null; onClose: () => void }) {
  const changes = changedFields(event?.before, event?.after, event?.changes);
  return <Dialog open={!!event} onOpenChange={open => !open && onClose()}><DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Procurement Audit Evidence</DialogTitle></DialogHeader>{event && <div className="space-y-5 text-sm"><div className="grid gap-3 rounded-lg border bg-gray-50 p-4 md:grid-cols-3"><Fact label="Employee" value={`${actorName(event.actor)}${event.actor?.email ? ` · ${event.actor.email}` : ''}`} /><Fact label="Document" value={`${human(event.documentType)} · ${event.entityId || 'multiple'}`} /><Fact label="Action" value={human(event.action)} /><Fact label="Evidence layer" value={event.layer === 'BUSINESS_EVENT' ? 'Business workflow event' : 'Authenticated record change'} /><Fact label="Timestamp" value={new Date(event.createdAt).toLocaleString()} /><Fact label="IP / Request" value={`${event.ip || '—'} · ${event.requestId || '—'}`} /></div>{event.message && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">{event.message}</div>}{changes.length > 0 && <div><h3 className="mb-2 font-semibold">Field-level changes</h3><div className="overflow-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-2 text-left">Field</th><th className="p-2 text-left">Previous</th><th className="p-2 text-left">New / Submitted</th></tr></thead><tbody>{changes.map(change => <tr className="border-t" key={change.field}><td className="p-2 font-mono text-xs">{change.field}</td><td className="max-w-80 break-all p-2 text-red-700">{change.before}</td><td className="max-w-80 break-all p-2 text-green-700">{change.after}</td></tr>)}</tbody></table></div></div>}<div className="grid gap-4 lg:grid-cols-3">{event.before != null && <JsonPanel title="Previous snapshot" value={event.before} />}<JsonPanel title="Submitted changes" value={event.changes} /><JsonPanel title="Saved result" value={event.after} /></div>{event.userAgent && <p className="break-all text-xs text-gray-500">Browser: {event.userAgent}</p>}</div>}</DialogContent></Dialog>;
}
function Fact({ label, value }: { label: string; value: string }) { return <p><span className="block text-xs uppercase tracking-wide text-gray-500">{label}</span><span className="break-all font-medium">{value}</span></p>; }
function JsonPanel({ title, value }: { title: string; value: unknown }) { return <div><Label>{title}</Label><pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">{json(value)}</pre></div>; }
function changedFields(before: unknown, after: unknown, submitted: unknown) {
  const oldRow = before && typeof before === 'object' && !Array.isArray(before) ? before as Record<string, unknown> : {};
  const newRow = after && typeof after === 'object' && !Array.isArray(after) ? after as Record<string, unknown> : submitted && typeof submitted === 'object' && !Array.isArray(submitted) ? submitted as Record<string, unknown> : {};
  return [...new Set([...Object.keys(oldRow), ...Object.keys(newRow)])].filter(field => json(oldRow[field]) !== json(newRow[field])).slice(0, 100).map(field => ({ field, before: compact(oldRow[field]), after: compact(newRow[field]) }));
}
function compact(value: unknown) { if (value == null) return '—'; const text = typeof value === 'string' ? value : json(value); return text.length > 300 ? `${text.slice(0, 300)}…` : text; }
