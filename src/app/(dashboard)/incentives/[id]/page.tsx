'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BadgePercent, Calculator, Pencil, Plus, RefreshCw, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { formatDateTime } from '@/lib/utils';
import { StatsCard } from '@/components/shared/StatsCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchemeFormDialog } from '@/components/incentives/SchemeFormDialog';
import { SlabDialog } from '@/components/incentives/SlabDialog';
import {
  CONTRIBUTION_STATUSES, STATUS_TRANSITIONS, formatAmount, formatMeasure, formatQuantity, formatReward, formatSchemeDate, humanize, useIncentivePermission,
  type CalculationResult, type IncentiveContribution, type IncentiveRun, type IncentiveScheme, type IncentiveSlab, type Paged, type SchemeStatus, type SchemeSummary,
} from '@/lib/incentives';

const LIMIT = 20;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-[#7c8591]">{label}</p>
      <div className="mt-0.5 text-sm text-[#1f2937]">{children}</div>
    </div>
  );
}

export default function IncentiveSchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const can = useIncentivePermission();
  const [scheme, setScheme] = useState<IncentiveScheme | null>(null);
  const [summary, setSummary] = useState<SchemeSummary | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [slabDialog, setSlabDialog] = useState<{ open: boolean; slab: IncentiveSlab | null }>({ open: false, slab: null });
  const [isCalculating, setIsCalculating] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/incentives/schemes/${id}`), 
      api.get(`/incentives/schemes/${id}/summary`),
      api.get('/suppliers', { params: { limit: 1000 } }).catch(() => null),
      api.get('/products', { params: { limit: 1000 } }).catch(() => null),
      api.get('/inventory/categories', { params: { limit: 1000 } }).catch(() => null),
      api.get('/platform/tenant').catch(() => null)
    ])
      .then(([schemeRes, summaryRes, supRes, prodRes, catRes, tenantRes]) => {
        if (cancelled) return;
        setScheme(schemeRes.data?.data);
        setSummary(summaryRes.data?.data);
        if (supRes?.data?.data?.items) setSuppliers(supRes.data.data.items);
        else if (supRes?.data?.data) setSuppliers(supRes.data.data);
        if (prodRes?.data?.data?.items) setProducts(prodRes.data.data.items);
        else if (prodRes?.data?.data) setProducts(prodRes.data.data);
        if (catRes?.data?.data?.items) setCategories(catRes.data.data.items);
        else if (catRes?.data?.data) setCategories(catRes.data.data);
        
        const tenantData = tenantRes?.data?.data;
        if (tenantData?.companies?.length > 0) {
          const allBranches = tenantData.companies.flatMap((c: any) => c.branches || []);
          setBranches(allBranches);
        }
        
        setLoadError(null);
      })
      .catch((err) => { if (!cancelled) setLoadError(showApiError(err, 'Failed to load incentive scheme') || 'Failed to load incentive scheme'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const refreshAll = () => setRefreshKey((k) => k + 1);
  const retry = () => { setIsLoading(true); setLoadError(null); refreshAll(); };

  const changeStatus = async (next: SchemeStatus) => {
    if (isChangingStatus) return;
    if (next === 'CANCELLED' && !window.confirm('Cancel this scheme? A cancelled scheme cannot be reactivated.')) return;
    setIsChangingStatus(true);
    try {
      await api.patch(`/incentives/schemes/${id}/status`, { status: next });
      showApiSuccess(`Scheme status changed to ${humanize(next)}`);
      refreshAll();
    } catch (err) {
      showApiError(err, 'Failed to change status');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const calculate = async () => {
    if (isCalculating) return;
    setIsCalculating(true);
    try {
      const res = await api.post(`/incentives/schemes/${id}/calculate`);
      setCalcResult(res.data?.data);
      showApiSuccess('Calculation completed');
      refreshAll();
    } catch (err) {
      showApiError(err, 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const deleteSlab = async (slab: IncentiveSlab) => {
    if (!window.confirm('Delete this slab?')) return;
    try {
      await api.delete(`/incentives/schemes/${id}/slabs/${slab.id}`);
      showApiSuccess('Slab deleted');
      refreshAll();
    } catch (err) {
      showApiError(err, 'Failed to delete slab');
    }
  };

  if (isLoading && !scheme) {
    return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (loadError || !scheme) {
    return (
      <div>
        <Link href="/incentives" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" />Incentive Schemes</Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError || 'Scheme not found'} <Button size="sm" variant="outline" className="ml-2" onClick={retry}>Retry</Button>
        </div>
      </div>
    );
  }

  const type = scheme.measurementType;
  const slabs = scheme.slabs || [];
  const canWrite = can('schemes', 'write');
  const transitions = canWrite ? STATUS_TRANSITIONS[scheme.status] : [];
  const progress = summary?.progress;
  const percent = progress?.progressToNextSlabPercent ? Math.min(100, Math.max(0, Number(progress.progressToNextSlabPercent))) : null;

  const slabColumns = [
    { key: 'threshold', header: 'Threshold', render: (s: IncentiveSlab) => formatMeasure(s.thresholdValue, type) },
    { key: 'reward', header: 'Reward', render: (s: IncentiveSlab) => formatReward(s.rewardType, s.rewardValue) },
    { key: 'alt', header: 'Alternate Reward', render: (s: IncentiveSlab) => (s.altRewardType ? formatReward(s.altRewardType, s.altRewardValue) : '—') },
    { key: 'state', header: 'Status', render: (s: IncentiveSlab) => (
      progress?.currentSlab?.id === s.id ? <span className="text-xs font-medium text-green-700">Reached</span> :
      progress?.nextSlab?.id === s.id ? <span className="text-xs font-medium text-amber-700">Next</span> : '—'
    ) },
    { key: 'actions', header: '', render: (s: IncentiveSlab) => canWrite || can('schemes', 'delete') ? (
      <div className="flex justify-end gap-2">
        {canWrite && <Button size="sm" variant="outline" onClick={() => setSlabDialog({ open: true, slab: s })}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
        {can('schemes', 'delete') && <Button size="sm" variant="outline" onClick={() => deleteSlab(s)}><Trash2 className="h-3.5 w-3.5" /></Button>}
      </div>
    ) : null },
  ];

  return (
    <div className="space-y-4">
      <Link href="/incentives" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" />Incentive Schemes</Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold leading-7 text-[#1f2937]">{scheme.name}</h1>
            <StatusBadge status={scheme.status} />
          </div>
          <p className="mt-0.5 text-sm text-[#6b7280]">{scheme.manufacturerLabel}{scheme.code ? ` · ${scheme.code}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('calculations', 'manage') && (
            <Button onClick={calculate} disabled={isCalculating || scheme.status !== 'ACTIVE'} title={scheme.status !== 'ACTIVE' ? 'Only ACTIVE schemes can be calculated' : undefined}>
              <Calculator className="mr-1.5 h-4 w-4" />{isCalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
          )}
          {canWrite && <Button variant="outline" onClick={() => setShowEdit(true)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>}
          {transitions.map((next) => (
            <Button key={next} variant="outline" disabled={isChangingStatus} onClick={() => changeStatus(next)}>
              {next === 'ACTIVE' ? (scheme.status === 'CLOSED' ? 'Reopen' : 'Activate') : next === 'CLOSED' ? 'Close' : 'Cancel Scheme'}
            </Button>
          ))}
          <Button variant="outline" size="icon" onClick={refreshAll} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={type === 'VALUE' ? 'Eligible Value' : 'Eligible Quantity'}
              value={type === 'VALUE' ? formatAmount(summary.achievement.eligibleValue) : `${formatQuantity(summary.achievement.eligibleQuantity)} units`}
              subtitle={`${summary.achievement.activeContributions} invoice contribution(s)`}
              icon={TrendingUp}
            />
            <StatsCard
              title="Estimated Incentive"
              value={formatAmount(summary.incentive.primaryAmount)}
              subtitle={summary.incentive.alternateAmount !== null ? `Alternate: ${formatAmount(summary.incentive.alternateAmount)}` : 'Not settled or approved'}
              icon={Wallet} iconColor="text-green-600" iconBg="bg-green-50"
            />
            <StatsCard
              title="Current Slab"
              value={progress?.currentSlab ? formatMeasure(progress.currentSlab.thresholdValue, type) : 'None reached'}
              subtitle={progress?.currentSlab ? formatReward(progress.currentSlab.rewardType, progress.currentSlab.rewardValue) : undefined}
              icon={BadgePercent} iconColor="text-purple-600" iconBg="bg-purple-50"
            />
            <StatsCard
              title="Remaining to Next Slab"
              value={progress?.nextSlab ? formatMeasure(progress.remainingToNextSlab, type) : 'Top slab reached'}
              subtitle={progress?.nextSlab ? `Target ${formatMeasure(progress.nextSlab.thresholdValue, type)}` : undefined}
              icon={Target} iconColor="text-amber-600" iconBg="bg-amber-50"
            />
          </div>

          <Card>
            <CardContent className="space-y-2 p-4">
              {percent !== null && progress?.nextSlab && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-[#6b7280]"><span>Progress to next slab</span><span>{percent}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eef1f3]"><div className="h-full rounded-full bg-[#2490ef]" style={{ width: `${percent}%` }} /></div>
                </div>
              )}
              <p className="text-xs text-[#7c8591]">
                {summary.freshness.lastCompletedAt ? `Last calculated ${formatDateTime(summary.freshness.lastCompletedAt)}. ` : 'Not calculated yet. '}
                {summary.incentive.note} Figures do not update automatically; use Recalculate after invoices change.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {calcResult && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Latest Calculation Result</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Field label="Invoices considered">{calcResult.invoicesConsidered}</Field>
              <Field label="Eligible invoices">{calcResult.invoicesEligible}</Field>
              <Field label="Excluded">{calcResult.invoicesExcluded.length}</Field>
              <Field label="Contributions created">{calcResult.contributionsCreated}</Field>
              <Field label="Superseded">{calcResult.contributionsSuperseded}</Field>
            </div>
            {calcResult.invoicesExcluded.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-[#6b7280]">Excluded invoices and reasons</summary>
                <ul className="mt-2 space-y-1 text-[#374151]">
                  {calcResult.invoicesExcluded.map((x, i) => <li key={`${x.invoiceNo}-${i}`}><span className="font-medium">{x.invoiceNo}</span>: {humanize(x.reason)}</li>)}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration &amp; Slabs</TabsTrigger>
          {can('contributions', 'read') && <TabsTrigger value="contributions">Contributions</TabsTrigger>}
          {can('calculations', 'read') && <TabsTrigger value="runs">Calculation Runs</TabsTrigger>}
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
              <Field label="Period">{formatSchemeDate(scheme.startDate)} – {formatSchemeDate(scheme.endDate)}</Field>
              <Field label="Measured by">{humanize(scheme.measurementType)}</Field>
              <Field label="Slab mode">{humanize(scheme.slabMode)}</Field>
              <Field label="Amount basis">{humanize(scheme.amountBasis)}</Field>
              <Field label="Return handling">{humanize(scheme.returnHandling)}</Field>
              <Field label="Date basis">{humanize(scheme.eligibilityDateBasis)}</Field>
              <Field label="Auto-calculate trigger">{humanize(scheme.autoCalculate)}</Field>
              
              <Field label="Min invoice value">{scheme.minInvoiceValue ? formatAmount(scheme.minInvoiceValue) : '—'}</Field>
              <Field label="Payment terms limit">{scheme.paymentConditionDays ? `${scheme.paymentConditionDays} days` : '—'}</Field>
              <Field label="Booking channel">{scheme.bookingChannel || '—'}</Field>
              <Field label="Eligible trade types">{scheme.allowAnyTradeType ? 'Any trade type' : scheme.eligibleTradeTypes.map(humanize).join(', ') || '—'}</Field>
              
              <Field label="Eligible suppliers">
                {scheme.allowAnySupplier 
                  ? 'Any supplier' 
                  : scheme.eligibleSupplierIds?.map(sid => suppliers.find(s => s.id === sid)?.name || sid).join(', ') || '—'}
              </Field>
              <Field label="Eligible branches">
                {scheme.allowAnyBranch 
                  ? 'Any branch' 
                  : scheme.eligibleBranchIds?.map(bid => branches.find(b => b.id === bid)?.name || bid).join(', ') || '—'}
              </Field>
              <Field label="Included categories">
                {(scheme.includedCategoryIds?.length ?? 0) > 0
                  ? scheme.includedCategoryIds!.map(cid => categories.find(c => c.id === cid)?.name || cid).join(', ')
                  : 'All categories'}
              </Field>
              <Field label="Reward excluded products">
                {(scheme.rewardExcludedProductIds?.length ?? 0) > 0 
                  ? scheme.rewardExcludedProductIds!.map(pid => {
                      const p = products.find(x => x.id === pid);
                      return p ? `${p.name} (${p.sku})` : pid;
                    }).join(', ') 
                  : 'None'}
              </Field>
              <div className="col-span-2 lg:col-span-4"><Field label="Description">{scheme.description || '—'}</Field></div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1f2937]">Slabs</h2>
            {canWrite && <Button size="sm" onClick={() => setSlabDialog({ open: true, slab: null })}><Plus className="mr-1 h-3.5 w-3.5" />Add Slab</Button>}
          </div>
          {slabs.length === 0 ? (
            <EmptyState icon={BadgePercent} title="No slabs configured" description="A scheme needs at least one slab before it can be activated." />
          ) : (
            <DataTable columns={slabColumns} data={slabs} />
          )}
        </TabsContent>

        {can('contributions', 'read') && <TabsContent value="contributions"><ContributionsTab schemeId={id} type={type} refreshKey={refreshKey} /></TabsContent>}
        {can('calculations', 'read') && <TabsContent value="runs"><RunsTab schemeId={id} refreshKey={refreshKey} /></TabsContent>}
      </Tabs>

      <SchemeFormDialog open={showEdit} scheme={scheme} onClose={() => setShowEdit(false)} onSaved={refreshAll} />
      <SlabDialog
        open={slabDialog.open} schemeId={scheme.id} measurementType={type} slab={slabDialog.slab}
        onClose={() => setSlabDialog({ open: false, slab: null })} onSaved={refreshAll}
      />
    </div>
  );
}

function ContributionsTab({ schemeId, type, refreshKey }: { schemeId: string; type: IncentiveScheme['measurementType']; refreshKey: number }) {
  const [items, setItems] = useState<IncentiveContribution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/incentives/schemes/${schemeId}/contributions`, { params: { page, limit: LIMIT, status } })
      .then((res) => {
        if (cancelled) return;
        const data: Paged<IncentiveContribution> = res.data?.data;
        setItems(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => { if (!cancelled) setError(showApiError(err, 'Failed to load contributions') || 'Failed to load contributions'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [schemeId, page, status, refreshKey]);

  const reload = (fn: () => void) => { setIsLoading(true); setError(null); fn(); };

  const columns = [
    { key: 'invoice', header: 'Purchase Invoice', render: (c: IncentiveContribution) => <span className="font-medium">{c.purchaseInvoice?.invoiceNo || '—'}</span> },
    { key: 'date', header: 'Invoice Date', render: (c: IncentiveContribution) => formatSchemeDate(c.purchaseInvoice?.date) },
    { key: 'trade', header: 'Trade Type', render: (c: IncentiveContribution) => humanize(c.purchaseInvoice?.tradeType) },
    { key: 'eligible', header: type === 'VALUE' ? 'Eligible Value' : 'Eligible Qty', className: 'text-right', render: (c: IncentiveContribution) => (type === 'VALUE' ? formatAmount(c.eligibleValue) : formatQuantity(c.eligibleQuantity)) },
    { key: 'lines', header: 'Lines', className: 'text-right', render: (c: IncentiveContribution) => c.lines?.length ?? 0 },
    { key: 'incentive', header: 'Incentive', className: 'text-right', render: (c: IncentiveContribution) => formatAmount(c.incentiveAmount) },
    { key: 'alt', header: 'Alternate', className: 'text-right', render: (c: IncentiveContribution) => (c.altIncentiveAmount === null ? '—' : formatAmount(c.altIncentiveAmount)) },
    { key: 'lifecycleStatus', header: 'Status', render: (c: IncentiveContribution) => <StatusBadge status={c.lifecycleStatus} /> },
    { key: 'calculatedAt', header: 'Calculated', render: (c: IncentiveContribution) => formatDateTime(c.calculatedAt) },
  ];

  return (
    <div className="space-y-3">
      <div className="max-w-[12rem]">
        <Select value={status} onValueChange={(v) => reload(() => { setStatus(v); setPage(1); })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CONTRIBUTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All' : humanize(s)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {error && !isLoading ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items.length === 0 && !isLoading ? (
        <EmptyState icon={Calculator} title="No contributions" description="Run a calculation to see the purchase invoices counted toward this scheme." />
      ) : (
        <>
          <DataTable columns={columns} data={items} isLoading={isLoading} />
          {total > LIMIT && <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={(p) => reload(() => setPage(p))} />}
        </>
      )}
    </div>
  );
}

function RunsTab({ schemeId, refreshKey }: { schemeId: string; refreshKey: number }) {
  const [items, setItems] = useState<IncentiveRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/incentives/schemes/${schemeId}/runs`, { params: { page, limit: LIMIT } })
      .then((res) => {
        if (cancelled) return;
        const data: Paged<IncentiveRun> = res.data?.data;
        setItems(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => { if (!cancelled) setError(showApiError(err, 'Failed to load calculation runs') || 'Failed to load calculation runs'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [schemeId, page, refreshKey]);

  const changePage = (p: number) => { setIsLoading(true); setError(null); setPage(p); };

  const columns = [
    { key: 'startedAt', header: 'Started', render: (r: IncentiveRun) => formatDateTime(r.startedAt) },
    { key: 'completedAt', header: 'Completed', render: (r: IncentiveRun) => (r.completedAt ? formatDateTime(r.completedAt) : '—') },
    { key: 'reason', header: 'Reason', render: (r: IncentiveRun) => humanize(r.reason) },
    { key: 'status', header: 'Status', render: (r: IncentiveRun) => <StatusBadge status={r.status} /> },
    { key: 'errorMessage', header: 'Error', render: (r: IncentiveRun) => r.errorMessage || '—' },
  ];

  return (
    <div className="space-y-3">
      {error && !isLoading ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items.length === 0 && !isLoading ? (
        <EmptyState icon={Calculator} title="No calculation runs" description="Runs appear here after the scheme is calculated." />
      ) : (
        <>
          <DataTable columns={columns} data={items} isLoading={isLoading} />
          {total > LIMIT && <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={changePage} />}
        </>
      )}
    </div>
  );
}
