'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSyncBlockReason, summarizeSyncError, validateSyncDateRange } from '@/lib/tallySync';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

const StatusBadge = ({ type, text }: { type: 'success' | 'error' | 'warning' | 'neutral', text: string }) => {
  const colors = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    neutral: 'bg-slate-100 text-slate-800 border-slate-200'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[type]}`}>
      {text}
    </span>
  );
};

export default function TallyIntegrationPage() {
  const [status, setStatus] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null); // null = unchanged from saved
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const jobsRes = await api.get('/tally/sync');
      setJobs(jobsRes.data?.data || []);
      
      const active = (jobsRes.data?.data || []).find((j: any) => 
        ['PENDING', 'CLAIMED', 'UPLOADING', 'PROCESSING'].includes(j.status)
      );
      if (active) {
        setActiveJobId(active.id);
        setActiveJob(active);
      }
    } catch (error) {
      showApiError(error, 'Could not load sync history');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const loadConnectionStatus = useCallback(async () => {
    setIsStatusLoading(true);
    try {
      const statusRes = await api.get('/tally/connection-status');
      setStatus(statusRes.data?.data);
    } catch (error) {
      showApiError(error, 'Could not load connection status');
    } finally {
      setIsStatusLoading(false);
    }
  }, []);

  const loadData = useCallback(() => {
    loadConnectionStatus();
    loadHistory();
  }, [loadConnectionStatus, loadHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await api.get(`/tally/sync/${jobId}`);
      const job = res.data?.data;
      setActiveJob(job);
      if (job && ['COMPLETED', 'FAILED', 'EXPIRED'].includes(job.status)) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setActiveJobId(null);
        loadHistory();
      }
    } catch (error) {
      // Silently ignore polling errors so it doesn't spam the console or show fatal Next.js overlays
    }
  }, [loadHistory]);

  useEffect(() => {
    if (activeJobId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollJobStatus(activeJobId);
      pollingRef.current = setInterval(() => {
        pollJobStatus(activeJobId);
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeJobId, pollJobStatus]);

  const getJobStatusText = (status: string, errorMessage?: string | null) => {
    switch (status) {
      case 'PENDING': return errorMessage ? 'Retrying after an error' : 'Waiting for the Tally Agent';
      case 'CLAIMED': return 'Agent claimed the job';
      case 'PROCESSING': return 'Synchronization in progress';
      case 'COMPLETED': return 'Synchronization completed';
      case 'FAILED': return 'Synchronization failed';
      case 'EXPIRED': return 'Synchronization expired';
      default: return status;
    }
  };

  const savedCompany: string | null = status?.tallyCompanyName || null;
  const availableCompanies: string[] = Array.isArray(status?.availableCompanies) ? status.availableCompanies : [];
  const isOnline = !!status?.isOnline;
  const companyValue = selectedCompany ?? savedCompany ?? '';
  const savedNotOpen = !!savedCompany && !availableCompanies.includes(savedCompany);
  // Keep the saved company visible in the dropdown even when Tally no longer lists it.
  const companyOptions = savedNotOpen ? [savedCompany as string, ...availableCompanies] : availableCompanies;
  const canSaveCompany = isOnline && !isSavingCompany && !!companyValue && companyValue !== savedCompany;

  const saveCompany = async () => {
    if (!canSaveCompany) return;
    setIsSavingCompany(true);
    try {
      const res = await api.put('/tally/connection/company', { tallyCompanyName: companyValue });
      showApiSuccess(res.data?.message || 'Tally company saved');
      setSelectedCompany(null);
      await loadConnectionStatus();
    } catch (error) {
      showApiError(error, 'Could not save Tally company');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const syncBlockReason = status
    ? getSyncBlockReason({ savedCompany, isOnline, tallyReachable: !!status.tallyReachable })
    : 'Loading connection status...';

  const startSync = async () => {
    if (isSubmitting || syncBlockReason) return;

    const range = validateSyncDateRange(fromDate, toDate);
    if (!range.valid) return showApiError(new Error(range.message));

    setIsSubmitting(true);
    try {
      const res = await api.post('/tally/sync', { fromDate: range.from, toDate: range.to });
      showApiSuccess('Sync job created');
      const jobId = res.data?.data?.jobId;
      if (jobId) {
        setActiveJobId(jobId);
        setFromDate('');
        setToDate('');
        loadHistory();
      }
    } catch (error) {
      showApiError(error, 'Could not start sync');
      loadData(); // company / sync-active state may have changed
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleError = (id: string) =>
    setExpandedErrors((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const renderError = (id: string, message?: string | null) => {
    const summary = summarizeSyncError(message);
    if (!summary) return '-';
    const open = expandedErrors.has(id);
    return (
      <div className="max-w-[320px]">
        <span title={summary.full}>{summary.short}</span>
        {summary.isLong && (
          <button type="button" className="ml-1 text-xs text-blue-600 hover:underline" onClick={() => toggleError(id)}>
            {open ? 'Hide' : 'Details'}
          </button>
        )}
        {open && <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-2 text-xs">{summary.full}</pre>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Tally Integration" description="Synchronize your accounting data directly from TallyPrime" />
      
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Current status of the TallyAgent connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Agent Status</p>
                <div>
                  {status?.isOnline ? (
                    <StatusBadge type="success" text="Online" />
                  ) : (
                    <StatusBadge type="neutral" text="Offline" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Tally Reachable</p>
                <div>
                  {status?.isOnline ? (
                    status?.tallyReachable ? <StatusBadge type="success" text="Reachable" /> : <StatusBadge type="error" text="Not Reachable" />
                  ) : (
                    <StatusBadge type="neutral" text="Unknown" />
                  )}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-muted-foreground">Tally Company</p>
                <div className="flex items-center gap-2">
                  <Select value={companyValue || undefined} onValueChange={setSelectedCompany} disabled={!isOnline || isSavingCompany}>
                    <SelectTrigger className="max-w-xs"><SelectValue placeholder={availableCompanies.length ? 'Select a company' : 'No companies open in Tally'} /></SelectTrigger>
                    <SelectContent>
                      {companyOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={saveCompany} disabled={!canSaveCompany}>
                    {isSavingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                {!isOnline && <p className="text-xs text-muted-foreground">Available when the Tally Agent is online.</p>}
                {isOnline && savedNotOpen && (
                  <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Selected company is not currently open in Tally.</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Last Heartbeat</p>
                <p className="font-medium">
                  {status?.lastHeartbeatAt ? new Date(status.lastHeartbeatAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Agent Version</p>
                <p className="font-medium">{status?.agentVersion || 'Not available'}</p>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={loadConnectionStatus} disabled={isStatusLoading}>
                {isStatusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start New Sync</CardTitle>
            <CardDescription>Request voucher synchronization for a specific date range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={!!activeJobId || isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={!!activeJobId || isSubmitting} />
              </div>
            </div>
            
            <Button onClick={startSync} disabled={!!activeJobId || !fromDate || !toDate || isSubmitting || !!syncBlockReason}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
              ) : activeJobId ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sync in progress...</>
              ) : (
                'Start Sync'
              )}
            </Button>
            {syncBlockReason && !activeJobId && <p className="text-xs text-muted-foreground">{syncBlockReason}</p>}

            {activeJobId && activeJob && (
              <div className="mt-4 rounded-md border p-4 bg-muted/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-[pulse_2s_ease-in-out_infinite] w-1/2 rounded-r-full" />
                </div>
                <div className="flex items-center justify-between mb-2 mt-2">
                  <span className="text-sm font-medium">Active Sync Job</span>
                  <StatusBadge type="warning" text={activeJob.status === 'PENDING' && activeJob.errorMessage ? 'RETRYING' : activeJob.status} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground mb-2">{getJobStatusText(activeJob.status, activeJob.errorMessage)}</p>
                  <p>Job ID: {activeJob.id}</p>
                  <p>Date Range: {activeJob.fromDate} to {activeJob.toDate}</p>
                  {activeJob.recordsProcessed !== undefined && (
                    <p>Records Processed: {activeJob.recordsProcessed}</p>
                  )}
                  {activeJob.errorMessage && (
                    <div className="text-red-500 mt-2">{renderError(`active-${activeJob.id}`, activeJob.errorMessage)}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Sync History</CardTitle>
            <CardDescription>Recent Tally synchronization jobs.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={isHistoryLoading}>
            {isHistoryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh History
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date Range</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Started At</th>
                  <th className="px-4 py-3 text-left font-medium">Records</th>
                  <th className="px-4 py-3 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      <p>No sync history available.</p>
                      <p className="mt-1 text-xs">Select a date range above and click Start Sync to begin.</p>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {job.fromDate} - {job.toDate}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge 
                          type={
                            job.status === 'COMPLETED' ? 'success' :
                            ['FAILED', 'EXPIRED'].includes(job.status) ? 'error' : 'warning'
                          } 
                          text={job.status === 'PENDING' && job.errorMessage ? 'RETRYING' : job.status} 
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {job.recordsProcessed || 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {renderError(job.id, job.errorMessage)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
