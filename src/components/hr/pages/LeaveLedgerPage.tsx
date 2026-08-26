'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showApiError, showApiSuccess } from '@/lib/apiError';

type EmployeeOption = {
  id: string;
  employeeId: string;
  salary?: number;
  user?: { firstName: string; lastName: string; email?: string };
  department?: { name: string };
  position?: { title: string };
  status?: string;
};

type Option = { id: string; name?: string; title?: string; code?: string };

function fullName(employee?: EmployeeOption) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  useEffect(() => {
    api
      .get('/hr/employees', { params: { limit: 300 } })
      .then((res) => setEmployees(res.data?.data?.items || []))
      .catch(() => setEmployees([]));
  }, []);
  return employees;
}

export function LeaveLedgerPage() {
  const employees = useEmployees();
  const [leaveTypes, setLeaveTypes] = useState<Option[]>([]);
  const [leavePeriods, setLeavePeriods] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<any>({
    employeeId: '',
    leaveTypeId: '',
    leavePeriodId: '',
    allocated: 12,
    fromDate: `${new Date().getFullYear()}-01-01`,
    toDate: `${new Date().getFullYear()}-12-31`,
  });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [types, periods, alloc, led] = await Promise.all([
        api.get('/hr/leave-types'),
        api.get('/hr/leave-periods'),
        api.get('/hr/leave-allocations'),
        api.get('/hr/leave-ledger'),
      ]);
      setLeaveTypes(types.data?.data || []);
      setLeavePeriods(periods.data?.data || []);
      setAllocations(alloc.data?.data || []);
      setLedger(led.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load leave ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const allocate = async () => {
    if (isSubmitting) return;

    if (!form.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!form.leaveTypeId) {
      toast.error('Please select a leave type');
      return;
    }
    if (!form.leavePeriodId) {
      toast.error('Please select a leave period');
      return;
    }
    if (!form.allocated || Number(form.allocated) <= 0) {
      toast.error('Allocated days must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/hr/leave-allocations', { ...form, allocated: Number(form.allocated) });
      showApiSuccess('Leave allocated successfully');
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Allocation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Leave Ledger"
        description="Leave balances generated from allocations and approved leave requests"
      >
        <Button onClick={allocate} disabled={isSubmitting || employees.length === 0 || leaveTypes.length === 0 || leavePeriods.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Allocating...' : 'Allocate Leave'}
        </Button>
      </PageHeader>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>New Leave Allocation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <Select value={form.employeeId} onValueChange={(v) => setForm((f: any) => ({ ...f, employeeId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.length === 0 ? (
                <SelectEmptyState
                  message="No employees found"
                  linkHref="/hr/employees"
                  linkText="Create Employee"
                />
              ) : (
                employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fullName(e)} ({e.employeeId})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select value={form.leavePeriodId} onValueChange={(v) => { const period = leavePeriods.find((item) => item.id === v); setForm((f: any) => ({ ...f, leavePeriodId: v, fromDate: period?.fromDate?.slice(0, 10) || f.fromDate, toDate: period?.toDate?.slice(0, 10) || f.toDate })); }}>
            <SelectTrigger><SelectValue placeholder="Leave period" /></SelectTrigger>
            <SelectContent>{leavePeriods.length === 0 ? <SelectEmptyState message="No leave periods found" linkHref="/hr/leave-setup" linkText="Create Leave Period" /> : leavePeriods.map((period) => <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.leaveTypeId} onValueChange={(v) => setForm((f: any) => ({ ...f, leaveTypeId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Leave type master" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.length === 0 ? (
                <SelectEmptyState
                  message="No leave types found"
                  linkHref="/hr/leave"
                  linkText="Create Leave Type"
                />
              ) : (
                leaveTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Days allowed"
            value={form.allocated}
            onChange={(e) => setForm((f: any) => ({ ...f, allocated: e.target.value }))}
          />
          <Input
            type="date"
            value={form.fromDate}
            onChange={(e) => setForm((f: any) => ({ ...f, fromDate: e.target.value }))}
          />
          <Input
            type="date"
            value={form.toDate}
            onChange={(e) => setForm((f: any) => ({ ...f, toDate: e.target.value }))}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          data={allocations}
          isLoading={isLoading}
          columns={[
            { key: 'employee', header: 'Employee', render: (r: any) => fullName(r.employee) },
            { key: 'leaveType', header: 'Type', render: (r: any) => r.leaveType?.name },
            { key: 'allocated', header: 'Allocated' },
            { key: 'used', header: 'Used' },
            {
              key: 'balance',
              header: 'Balance',
              render: (r: any) => <span className="font-semibold text-blue-700">{r.balance}</span>,
            },
          ]}
        />
        <DataTable
          data={ledger}
          isLoading={isLoading}
          columns={[
            {
              key: 'transactionDate',
              header: 'Date',
              render: (r: any) => formatDate(r.transactionDate),
            },
            { key: 'employee', header: 'Employee', render: (r: any) => fullName(r.employee) },
            { key: 'entryType', header: 'Type', render: (r: any) => <StatusBadge status={r.entryType} /> },
            { key: 'leaves', header: 'Leaves' },
            { key: 'balanceAfter', header: 'Balance' },
          ]}
        />
      </div>
    </div>
  );
}
