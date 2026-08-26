'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showApiError } from '@/lib/apiError';

function fullName(employee?: any) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

function num(value: any) {
  return Number(value || 0);
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function SalarySlipsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [filters, setFilters] = useState({ employeeId: '', month: '', year: String(new Date().getFullYear()) });
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, row) => ({
          gross: acc.gross + num(row.grossPay),
          deduction: acc.deduction + num(row.totalDeduction),
          net: acc.net + num(row.netPay),
        }),
        { gross: 0, deduction: 0, net: 0 }
      ),
    [items]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [slipRes, employeeRes] = await Promise.all([
        api.get('/hr/salary-slips', {
          params: {
            ...filters,
            employeeId: filters.employeeId || undefined,
            month: filters.month || undefined,
            year: filters.year || undefined,
          },
        }),
        api.get('/hr/employees', { params: { limit: 500 } }),
      ]);
      setItems(slipRes.data?.data || []);
      setEmployees(employeeRes.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load salary slips');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.employeeId, filters.month, filters.year]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary Slips"
        description="Employee-wise payroll output generated from submitted payroll entries"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Gross Pay" value={formatCurrency(totals.gross)} />
        <Metric label="Deductions" value={formatCurrency(totals.deduction)} />
        <Metric label="Net Pay" value={formatCurrency(totals.net)} />
      </div>
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Employee">
            <Select
              value={filters.employeeId}
              onValueChange={(employeeId) => setFilters((prev) => ({ ...prev, employeeId }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {fullName(employee)} ({employee.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Month">
            <Select value={filters.month} onValueChange={(month) => setFilters((prev) => ({ ...prev, month }))}>
              <SelectTrigger>
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All months</SelectItem>
                {months.map((name, index) => (
                  <SelectItem key={name} value={String(index + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Year">
            <Input
              value={filters.year}
              onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
            />
          </Field>
        </CardContent>
      </Card>
      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No salary slips"
          description="Generate a payroll entry to create salary slips"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <DataTable
            data={items}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedId(row.id)}
            columns={[
              {
                key: 'slipNo',
                header: 'Slip No',
                render: (row: any) => <span className="font-mono text-xs">{row.slipNo}</span>,
              },
              { key: 'employee', header: 'Employee', render: (row: any) => fullName(row.employee) },
              { key: 'period', header: 'Period', render: (row: any) => `${months[row.month - 1]} ${row.year}` },
              { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
              {
                key: 'grossPay',
                header: 'Gross',
                render: (row: any) => formatCurrency(num(row.grossPay), row.currency),
              },
              {
                key: 'totalDeduction',
                header: 'Deduction',
                render: (row: any) => formatCurrency(num(row.totalDeduction), row.currency),
              },
              {
                key: 'netPay',
                header: 'Net',
                render: (row: any) => (
                  <span className="font-semibold text-green-700">
                    {formatCurrency(num(row.netPay), row.currency)}
                  </span>
                ),
              },
            ]}
          />
          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>{selected.slipNo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm">
                  <p className="font-semibold text-[#1f2937]">{fullName(selected.employee)}</p>
                  <p className="text-[#6b7280]">
                    {months[selected.month - 1]} {selected.year} · {selected.status}
                  </p>
                </div>
                <DataTable
                  data={selected.items || []}
                  columns={[
                    { key: 'name', header: 'Component' },
                    { key: 'type', header: 'Type', render: (row: any) => <StatusBadge status={row.type} /> },
                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (row: any) => formatCurrency(num(row.amount), selected.currency),
                    },
                  ]}
                />
                <div className="space-y-1 border-t border-[#e5e2dc] pt-3 text-sm">
                  <Line label="Gross" value={formatCurrency(num(selected.grossPay), selected.currency)} />
                  <Line
                    label="Deductions"
                    value={formatCurrency(num(selected.totalDeduction), selected.currency)}
                  />
                  <Line
                    label="Net Pay"
                    value={formatCurrency(num(selected.netPay), selected.currency)}
                    strong
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-[#6b7280] uppercase font-semibold">{label}</p>
        <p className="mt-1 text-xl font-semibold text-[#1f2937]">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#4b5563]">{label}</Label>
      {children}
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6b7280]">{label}</span>
      <span className={strong ? 'font-semibold text-[#1f2937]' : ''}>{value}</span>
    </div>
  );
}
