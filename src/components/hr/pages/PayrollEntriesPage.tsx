'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showApiError, showApiSuccess } from '@/lib/apiError';

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

export function PayrollEntriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, row) => ({
          gross: acc.gross + num(row.totalGross),
          deduction: acc.deduction + num(row.totalDeduction),
          net: acc.net + num(row.totalNet),
          slips: acc.slips + Number(row.salarySlips?.length || 0),
        }),
        { gross: 0, deduction: 0, net: 0, slips: 0 }
      ),
    [items]
  );

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/hr/payroll-entries', { params: { month, year } });
      setItems(res.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load payroll entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [month, year]);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/hr/payroll-entries', { month: Number(month), year: Number(year), notes });
      showApiSuccess(res.data?.message || 'Payroll generated successfully');
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not generate payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/hr/payroll-entries/${id}/status`, { status });
      showApiSuccess(
        status === 'SUBMITTED'
          ? 'Payroll submitted'
          : status === 'PAID'
          ? 'Payroll marked paid'
          : 'Payroll cancelled'
      );
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not update payroll status');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll Entries"
        description="Monthly payroll document that generates salary slips from assigned salary structures"
      >
        <Button onClick={generate} disabled={isGenerating}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Generate Payroll'}
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Salary Slips" value={totals.slips.toLocaleString()} />
        <Metric label="Gross Pay" value={formatCurrency(totals.gross)} />
        <Metric label="Deductions" value={formatCurrency(totals.deduction)} />
        <Metric label="Net Pay" value={formatCurrency(totals.net)} />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[180px_140px_1fr]">
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((name, index) => (
                  <SelectItem key={name} value={String(index + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Payroll remarks (e.g. June Monthly Payrun)"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={items}
        isLoading={isLoading}
        columns={[
          {
            key: 'payrollNo',
            header: 'Payroll No',
            render: (row: any) => <span className="font-mono text-xs font-semibold">{row.payrollNo}</span>,
          },
          { key: 'period', header: 'Period', render: (row: any) => `${months[row.month - 1]} ${row.year}` },
          { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
          { key: 'salarySlips', header: 'Slips', render: (row: any) => row.salarySlips?.length || 0 },
          { key: 'totalGross', header: 'Gross', render: (row: any) => formatCurrency(num(row.totalGross)) },
          { key: 'totalDeduction', header: 'Deduction', render: (row: any) => formatCurrency(num(row.totalDeduction)) },
          {
            key: 'totalNet',
            header: 'Net',
            render: (row: any) => (
              <span className="font-semibold text-green-700">{formatCurrency(num(row.totalNet))}</span>
            ),
          },
          {
            key: 'actions',
            header: '',
            render: (row: any) => (
              <div className="flex gap-1 justify-end">
                {row.status === 'DRAFT' && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(row.id, 'SUBMITTED')}>
                    Submit
                  </Button>
                )}
                {row.status === 'SUBMITTED' && (
                  <Button size="sm" onClick={() => setStatus(row.id, 'PAID')}>
                    Mark Paid
                  </Button>
                )}
                {row.status === 'DRAFT' && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(row.id, 'CANCELLED')}>
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
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
