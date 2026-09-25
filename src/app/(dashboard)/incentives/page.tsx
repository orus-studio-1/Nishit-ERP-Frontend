'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, BadgePercent } from 'lucide-react';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchemeFormDialog } from '@/components/incentives/SchemeFormDialog';
import {
  SCHEME_STATUSES, formatSchemeDate, humanize, useIncentivePermission,
  type IncentiveScheme, type Paged,
} from '@/lib/incentives';

const ALL = '__all__';
const LIMIT = 20;

export default function IncentiveSchemesPage() {
  const can = useIncentivePermission();
  const [schemes, setSchemes] = useState<IncentiveScheme[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [debouncedManufacturer, setDebouncedManufacturer] = useState('');
  const [status, setStatus] = useState(ALL);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IncentiveScheme | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setDebouncedManufacturer(manufacturer.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search, manufacturer]);

  useEffect(() => {
    let cancelled = false;
    api.get('/incentives/schemes', {
      params: {
        page, limit: LIMIT,
        search: debouncedSearch || undefined,
        manufacturer: debouncedManufacturer || undefined,
        status: status === ALL ? undefined : status,
      },
    })
      .then((res) => {
        if (cancelled) return;
        const data: Paged<IncentiveScheme> = res.data?.data;
        setSchemes(data?.items || []);
        setTotal(data?.total || 0);
        setLoadError(null);
      })
      .catch((err) => { if (!cancelled) setLoadError(showApiError(err, 'Failed to load incentive schemes') || 'Failed to load incentive schemes'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, debouncedSearch, debouncedManufacturer, status, refreshKey]);

  const fetchSchemes = () => { setIsLoading(true); setLoadError(null); setRefreshKey((k) => k + 1); };

  const hasFilters = Boolean(debouncedSearch || debouncedManufacturer || status !== ALL);
  const canCreate = can('schemes', 'create');
  const canEdit = can('schemes', 'write');

  const columns = [
    { key: 'name', header: 'Scheme', render: (s: IncentiveScheme) => (
      <div>
        <Link href={`/incentives/${s.id}`} className="font-medium text-blue-600 hover:underline">{s.name}</Link>
        {s.code && <p className="text-xs text-[#7c8591]">{s.code}</p>}
      </div>
    ) },
    { key: 'manufacturerLabel', header: 'Manufacturer' },
    { key: 'period', header: 'Period', render: (s: IncentiveScheme) => `${formatSchemeDate(s.startDate)} – ${formatSchemeDate(s.endDate)}` },
    { key: 'measurementType', header: 'Measured By', render: (s: IncentiveScheme) => humanize(s.measurementType) },
    { key: 'slabMode', header: 'Slab Mode', render: (s: IncentiveScheme) => humanize(s.slabMode) },
    { key: 'slabs', header: 'Slabs', render: (s: IncentiveScheme) => s._count?.slabs ?? 0 },
    { key: 'status', header: 'Status', render: (s: IncentiveScheme) => <StatusBadge status={s.status} /> },
    { key: 'actions', header: '', render: (s: IncentiveScheme) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" asChild><Link href={`/incentives/${s.id}`} onClick={(e) => e.stopPropagation()}>View</Link></Button>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(s); setShowModal(true); }}>
            <Pencil className="mr-1 h-3.5 w-3.5" />Edit
          </Button>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Incentive Schemes"
        description="Manufacturer incentive schemes, slabs and progress"
        action={canCreate ? { label: 'New Scheme', onClick: () => { setEditing(null); setShowModal(true); }, icon: Plus } : undefined}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Input placeholder="Manufacturer (exact name)" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {SCHEME_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loadError && !isLoading ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError} <Button size="sm" variant="outline" className="ml-2" onClick={fetchSchemes}>Retry</Button>
        </div>
      ) : schemes.length === 0 && !isLoading ? (
        <EmptyState
          icon={BadgePercent}
          title={hasFilters ? 'No matching schemes' : 'No incentive schemes yet'}
          description={hasFilters ? 'Try changing or clearing the filters.' : 'Create a scheme to start tracking manufacturer incentives.'}
          action={!hasFilters && canCreate ? { label: 'New Scheme', onClick: () => { setEditing(null); setShowModal(true); } } : undefined}
        />
      ) : (
        <>
          <DataTable columns={columns} data={schemes} isLoading={isLoading} onRowClick={undefined} />
          {total > LIMIT && <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={(p) => { setIsLoading(true); setPage(p); }} />}
        </>
      )}

      <SchemeFormDialog
        open={showModal}
        scheme={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={fetchSchemes}
      />
    </div>
  );
}
