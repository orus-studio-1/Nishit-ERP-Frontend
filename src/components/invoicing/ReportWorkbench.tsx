'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { showApiError } from '@/lib/apiError';

type FilterConfig = {
  search?: boolean;
  customer?: boolean;
  dateRange?: boolean;
  overdue?: boolean;
  asOf?: boolean;
  groupBy?: boolean;
};

export function ReportWorkbench({
  title,
  description,
  endpoint,
  columns,
  keyField,
  filters: filterConfig = {},
  kpis,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: any[];
  keyField?: string;
  filters?: FilterConfig;
  kpis: { key: string; label: string; money?: boolean }[];
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    customerId: 'ALL',
    fromDate: '',
    toDate: '',
    asOfDate: new Date().toISOString().slice(0, 10),
    overdue: 'ALL',
    groupBy: 'month',
  });

  const params = useMemo(() => ({
    search: filterConfig.search && filter.search ? filter.search : undefined,
    customerId: filterConfig.customer && filter.customerId !== 'ALL' ? filter.customerId : undefined,
    fromDate: filterConfig.dateRange && filter.fromDate ? filter.fromDate : undefined,
    toDate: filterConfig.dateRange && filter.toDate ? filter.toDate : undefined,
    asOfDate: filterConfig.asOf ? filter.asOfDate : undefined,
    overdue: filterConfig.overdue && filter.overdue !== 'ALL' ? filter.overdue : undefined,
    groupBy: filterConfig.groupBy ? filter.groupBy : undefined,
  }), [filter, filterConfig]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(endpoint, { params });
      const payload = res.data?.data;
      setRows(Array.isArray(payload) ? payload : payload?.rows || []);
      setTotals(res.data?.totals || payload?.totals || {});
    } catch (err: any) {
      showApiError(err, `Failed to load ${title}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [endpoint]);
  useEffect(() => {
    api.get('/customers', { params: { limit: 200, isActive: true } })
      .then(res => setCustomers(res.data?.data?.items || res.data?.data || []))
      .catch(() => setCustomers([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1f2937]">{title}</h1>
          <p className="text-sm text-[#6b7280]">{description}</p>
        </div>
        <Button variant="outline" onClick={load}><SlidersHorizontal className="mr-2 h-4 w-4" />Run Report</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map(kpi => <Kpi key={kpi.key} label={kpi.label} value={totals[kpi.key] || 0} money={kpi.money} />)}
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-6">
            {filterConfig.search && (
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3af]" />
                <Input className="pl-8" value={filter.search} onChange={event => setFilter(prev => ({ ...prev, search: event.target.value }))} placeholder="Search invoice, customer, item..." />
              </div>
            )}
            {filterConfig.customer && (
              <Select value={filter.customerId} onValueChange={customerId => setFilter(prev => ({ ...prev, customerId }))}>
                <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
                <SelectContent><SelectItem value="ALL">All customers</SelectItem>{customers.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {filterConfig.dateRange && (
              <>
                <Input type="date" value={filter.fromDate} onChange={event => setFilter(prev => ({ ...prev, fromDate: event.target.value }))} />
                <Input type="date" value={filter.toDate} onChange={event => setFilter(prev => ({ ...prev, toDate: event.target.value }))} />
              </>
            )}
            {filterConfig.asOf && <Input type="date" value={filter.asOfDate} onChange={event => setFilter(prev => ({ ...prev, asOfDate: event.target.value }))} />}
            {filterConfig.overdue && (
              <Select value={filter.overdue} onValueChange={overdue => setFilter(prev => ({ ...prev, overdue }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ALL">All open</SelectItem><SelectItem value="true">Overdue only</SelectItem></SelectContent>
              </Select>
            )}
            {filterConfig.groupBy && (
              <Select value={filter.groupBy} onValueChange={groupBy => setFilter(prev => ({ ...prev, groupBy }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['month', 'quarter', 'year'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable data={rows} columns={columns} keyField={keyField} isLoading={isLoading} emptyMessage="No report data found" />
    </div>
  );
}

function Kpi({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-[#6b7280]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#1f2937]">{money ? formatCurrency(Number(value || 0)) : Number(value || 0).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
