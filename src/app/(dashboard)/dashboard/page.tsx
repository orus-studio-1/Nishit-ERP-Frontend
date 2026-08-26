'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, DollarSign, FileText, Package, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const colors = ['#2490ef', '#0f9d58', '#d98324', '#c3423f', '#6350b8', '#0f7a8a'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [chartMode, setChartMode] = useState<'revenue' | 'invoice' | 'lead'>('revenue');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  const monthlyData = Array.isArray(stats?.monthlyRevenue)
    ? stats.monthlyRevenue.map((d: any) => ({ month: new Date(d.month).toLocaleString('default', { month: 'short' }), revenue: Number(d.revenue) || 0 }))
    : [];
  const invoiceStatus = stats?.invoiceStatus || [];
  const leadStatus = stats?.leadStatus || [];
  const pipelineRows = Object.entries(stats?.pipeline?.stages || {}).map(([stage, row]: any) => ({ stage, ...row }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold leading-7 text-[#1f2937]">Dashboard</h1>
        <p className="text-sm text-[#6b7280]">Live ERP desk for revenue, receivables, CRM, stock, and people operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi href="/invoicing/reports/revenue-by-period" title="Revenue" value={formatCurrency(stats?.revenue?.total || 0)} note={`${formatCurrency(stats?.revenue?.thisMonth || 0)} this month`} icon={DollarSign} tone="green" />
        <Kpi href="/invoicing/reports/outstanding" title="Receivables" value={formatCurrency(stats?.pendingInvoices?.amount || 0)} note={`${stats?.pendingInvoices?.count || 0} open invoices`} icon={FileText} tone="amber" />
        <Kpi href="/invoicing/reports/aging" title="Overdue" value={formatCurrency(stats?.overdueInvoices?.amount || 0)} note={`${stats?.overdueInvoices?.count || 0} risky invoices`} icon={AlertTriangle} tone="red" />
        <Kpi href="/crm/opportunities" title="CRM Pipeline" value={formatCurrency(stats?.pipeline?.openValue || 0)} note={`${formatCurrency(stats?.pipeline?.weightedValue || 0)} weighted`} icon={TrendingUp} tone="blue" />
        <Kpi href="/customers" title="Customers" value={stats?.activeCustomers || 0} note="active accounts" icon={Users} tone="blue" />
        <Kpi href="/hr/employees" title="Employees" value={stats?.activeEmployees || 0} note="active workforce" icon={UserCheck} tone="purple" />
        <Kpi href="/crm/leads" title="Open Leads" value={stats?.openLeads || 0} note="needs sales action" icon={TrendingUp} tone="blue" />
        <Kpi href="/inventory/reports/stock-balance" title="Low Stock" value={stats?.lowStock?.length || 0} note="below reorder level" icon={Package} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Business Movement</CardTitle>
              <div className="flex rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-1 text-xs">
                {(['revenue', 'invoice', 'lead'] as const).map(mode => (
                  <button key={mode} onClick={() => setChartMode(mode)} className={chartMode === mode ? 'rounded bg-white px-2.5 py-1 font-medium text-[#1674c4] shadow-sm' : 'px-2.5 py-1 text-[#6b7280]'}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartMode === 'revenue' && <RevenueChart rows={monthlyData} />}
            {chartMode === 'invoice' && <Donut rows={invoiceStatus} nameKey="status" valueKey="count" />}
            {chartMode === 'lead' && <Donut rows={leadStatus} nameKey="status" valueKey="count" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pipeline by Stage</CardTitle></CardHeader>
          <CardContent>
            {pipelineRows.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pipelineRows} layout="vertical" margin={{ left: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={96} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                  <Bar dataKey="value" fill="#2490ef" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyCopy text="No pipeline data yet." />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ListCard title="Top Customers" href="/invoicing/reports/revenue-by-customer">
          {stats?.topCustomers?.length ? stats.topCustomers.map((row: any) => (
            <Link key={row.customerId} href={`/customers/${row.customerId}`} className="flex items-center justify-between rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]">
              <div><p className="text-sm font-medium">{row.customerName}</p><p className="text-xs text-[#8a929d]">{row.invoiceCount} paid invoices</p></div>
              <p className="text-sm font-semibold">{formatCurrency(row.revenue)}</p>
            </Link>
          )) : <EmptyCopy text="No customer revenue yet." />}
        </ListCard>

        <ListCard title="Recent Invoices" href="/invoicing/sales-invoices">
          {stats?.recentInvoices?.length ? stats.recentInvoices.map((inv: any) => (
            <Link key={inv.id} href={`/invoicing/sales-invoices/${inv.id}`} className="flex items-center justify-between rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]">
              <div><p className="text-sm font-medium">{inv.invoiceNo}</p><p className="text-xs text-[#8a929d]">{inv.customer?.name}</p></div>
              <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(inv.total, inv.currency)}</p><StatusBadge status={inv.status} /></div>
            </Link>
          )) : <EmptyCopy text="No invoices yet." />}
        </ListCard>

        <ListCard title="CRM Actions" href="/crm/activities">
          {stats?.recentActivities?.length ? stats.recentActivities.map((item: any) => (
            <Link key={item.id} href="/crm/activities" className="block rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]">
              <div className="flex items-center justify-between"><p className="text-sm font-medium">{item.subject}</p><StatusBadge status={item.type} /></div>
              <p className="mt-1 text-xs text-[#8a929d]">{item.dueDate ? formatDateTime(item.dueDate) : 'No due date'} · {item.lead?.title || item.opportunity?.title || 'General CRM'}</p>
            </Link>
          )) : <EmptyCopy text="No activities due today." />}
        </ListCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ListCard title="Low Stock Alerts" href="/inventory/reports/stock-balance">
          {stats?.lowStock?.length ? stats.lowStock.slice(0, 8).map((item: any) => (
            <Link key={item.id} href={`/inventory/products`} className="flex items-center justify-between rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]">
              <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-[#8a929d]">{item.sku}</p></div>
              <div className="text-right"><p className="text-sm font-semibold text-[#c3423f]">{item.currentStock}</p><p className="text-xs text-[#8a929d]">min {item.minStockLevel}</p></div>
            </Link>
          )) : <EmptyCopy text="All products are well stocked." />}
        </ListCard>

        <ListCard title="Recent Leads" href="/crm/leads">
          {stats?.recentLeads?.length ? stats.recentLeads.map((lead: any) => (
            <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="flex items-center justify-between rounded-md border border-[#f0ede8] px-3 py-2 hover:bg-[#f8faf9]">
              <div><p className="text-sm font-medium">{lead.title || `${lead.firstName} ${lead.lastName}`}</p><p className="text-xs text-[#8a929d]">{lead.company || lead.source || 'Individual'}</p></div>
              <StatusBadge status={lead.status} />
            </Link>
          )) : <EmptyCopy text="No leads yet." />}
        </ListCard>
      </div>
    </div>
  );
}

function Kpi({ href, fallbackHref, title, value, note, icon: Icon, tone }: any) {
  const tones: any = {
    green: 'bg-[#eefaf3] text-[#0f9d58]',
    amber: 'bg-[#fff7ed] text-[#d98324]',
    red: 'bg-[#fff1f0] text-[#c3423f]',
    blue: 'bg-[#eef6fd] text-[#1674c4]',
    purple: 'bg-[#f4f1ff] text-[#6350b8]',
  };
  return (
    <Link href={href || fallbackHref} className="rounded-md border border-[#e5e2dc] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-[#cfd7df] hover:bg-[#fbfcfd]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-[#7c8591]">{title}</p><p className="mt-1 truncate text-2xl font-semibold text-[#1f2937]">{value}</p><p className="mt-1 text-xs text-[#6b7280]">{note}</p></div>
        <span className={`rounded-md p-2 ${tones[tone] || tones.blue}`}><Icon className="h-5 w-5" /></span>
      </div>
    </Link>
  );
}

function RevenueChart({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyCopy text="No revenue data yet." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
        <Area type="monotone" dataKey="revenue" stroke="#2490ef" fill="#dff0ff" strokeWidth={2} />
      </AreaChart>
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

function ListCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{title}</CardTitle><Link href={href} className="text-xs font-medium text-[#1674c4] hover:underline">View all</Link></div></CardHeader><CardContent className="space-y-2">{children}</CardContent></Card>;
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-[#e5e2dc] text-sm text-[#8a929d]">{text}</div>;
}
