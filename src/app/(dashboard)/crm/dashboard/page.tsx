'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Target, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';
import { Skeleton } from '@/components/ui/skeleton';

const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const colors = ['#2490ef', '#6350b8', '#d98324', '#0f7a8a', '#0f9d58', '#c3423f', '#7c8591'];

export default function CrmDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [activeDetail, setActiveDetail] = useState<'pipeline' | 'sources' | 'activities'>('pipeline');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/crm/dashboard')
      .then((res) => setData(res.data?.data))
      .catch((err) => showApiError(err, 'Failed to load CRM dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  const pipeline = data?.pipeline || {};
  const pipelineRows = stages.map((stage) => ({ stage, ...(pipeline[stage] || { count: 0, value: 0, weightedValue: 0 }) }));
  const openLeads = (data?.leadCounts?.NEW || 0) + (data?.leadCounts?.CONTACTED || 0) + (data?.leadCounts?.QUALIFIED || 0);
  const sourceRows = data?.sourceCounts || [];
  const activityRows = data?.activityMix || [];

  return (
    <div className="space-y-5">
      <PageHeader title="CRM Dashboard" description="Sales funnel, lead quality, follow-up risk, and pipeline movement." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric href="/crm/leads" title="Open Leads" value={openLeads} note={`${data?.staleLeads || 0} need follow-up`} icon={Users} />
        <Metric href="/crm/opportunities" title="Open Pipeline" value={formatCurrency(data?.openPipelineValue || 0)} note={`${formatCurrency(data?.weightedPipelineValue || 0)} weighted`} icon={TrendingUp} />
        <Metric href="/crm/activities" title="Due Today" value={data?.dueTodayActivities || 0} note={`${data?.overdueActivities || 0} overdue`} icon={CalendarClock} />
        <Metric href="/crm/opportunities" title="Win Rate" value={`${data?.winRate || 0}%`} note="Closed won vs closed lost" icon={Target} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>CRM Performance</CardTitle>
              <div className="flex rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-1 text-xs">
                {(['pipeline', 'sources', 'activities'] as const).map((item) => (
                  <button key={item} onClick={() => setActiveDetail(item)} className={activeDetail === item ? 'rounded bg-white px-2.5 py-1 font-medium text-[#1674c4] shadow-sm' : 'px-2.5 py-1 text-[#6b7280]'}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeDetail === 'pipeline' && <PipelineChart rows={pipelineRows} />}
            {activeDetail === 'sources' && <Donut rows={sourceRows} nameKey="source" valueKey="count" />}
            {activeDetail === 'activities' && <Donut rows={activityRows} nameKey="type" valueKey="count" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Follow-up Risk</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <RiskLine label="Overdue activities" value={data?.overdueActivities || 0} href="/crm/activities" tone="danger" />
            <RiskLine label="Due today" value={data?.dueTodayActivities || 0} href="/crm/activities" tone="warn" />
            <RiskLine label="Stale open leads" value={data?.staleLeads || 0} href="/crm/leads" tone="info" />
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase text-[#7c8591]">Pipeline Trend</p>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={data?.pipelineTrend || []}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                  <Line type="monotone" dataKey="value" stroke="#2490ef" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="weightedValue" stroke="#0f9d58" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Hot Leads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.hotLeads?.length ? data.hotLeads.map((lead: any) => (
              <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-[#f0ede8] p-3 hover:bg-[#f8faf9]">
                <div>
                  <p className="text-sm font-medium text-[#1f2937]">{lead.title || `${lead.firstName} ${lead.lastName}`}</p>
                  <p className="text-xs text-[#6b7280]">{lead.company || lead.source} · score {lead.score || 0}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={lead.status} />
                  <p className="mt-1 text-xs font-medium text-[#374151]">{formatCurrency(Number(lead.value || 0))}</p>
                </div>
              </Link>
            )) : <EmptyCopy text="No active hot leads yet." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming Activities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data?.upcomingActivities?.length ? data.upcomingActivities.map((item: any) => (
              <Link key={item.id} href="/crm/activities" className="block rounded-md border border-[#e5e2dc] p-3 hover:bg-[#f8faf9]">
                <div className="flex items-center justify-between gap-2"><StatusBadge status={item.type} /><span className="text-xs text-[#8a929d]">{item.dueDate ? formatDateTime(item.dueDate) : 'No due date'}</span></div>
                <p className="mt-2 text-sm font-medium">{item.subject}</p>
                <p className="text-xs text-[#6b7280]">{item.lead?.title || item.opportunity?.title || 'General CRM'}</p>
              </Link>
            )) : <EmptyCopy text="No pending follow-ups." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ href, title, value, note, icon: Icon }: any) {
  return (
    <Link href={href} className="rounded-md border border-[#e5e2dc] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#cfd7df] hover:bg-[#fbfcfd]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-[#7c8591]">{title}</p><p className="mt-1 text-2xl font-semibold text-[#1f2937]">{value}</p><p className="mt-1 text-xs text-[#6b7280]">{note}</p></div>
        <span className="rounded-md bg-[#eef6fd] p-2 text-[#1674c4]"><Icon className="h-5 w-5" /></span>
      </div>
    </Link>
  );
}

function PipelineChart({ rows }: { rows: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
        <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Number(v) / 1000}k`} />
        <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
        <Bar dataKey="value" fill="#2490ef" radius={[4, 4, 0, 0]} />
        <Bar dataKey="weightedValue" fill="#0f9d58" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ rows, nameKey, valueKey }: { rows: any[]; nameKey: string; valueKey: string }) {
  if (!rows.length) return <EmptyCopy text="No chart data yet." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={rows} dataKey={valueKey} nameKey={nameKey} innerRadius={64} outerRadius={102} paddingAngle={2}>
          {rows.map((_: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RiskLine({ label, value, href, tone }: any) {
  const toneClass = tone === 'danger' ? 'text-[#c3423f]' : tone === 'warn' ? 'text-[#d98324]' : 'text-[#1674c4]';
  return <Link href={href} className="flex items-center justify-between rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]"><span className="text-sm text-[#4b5563]">{label}</span><span className={`text-lg font-semibold ${toneClass}`}>{value}</span></Link>;
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-[#e5e2dc] text-sm text-[#8a929d]">{text}</div>;
}
