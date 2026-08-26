'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Check, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { LeaveRequest, Employee, LeaveType } from '@/types';
import { formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';

function employeeName(employee?: Employee) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

function inclusiveDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-[#6b7280] uppercase font-semibold">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#1f2937]">{value}</p>
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

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showLeaveTypeForm, setShowLeaveTypeForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [leaveTypeForm, setLeaveTypeForm] = useState({ name: '', daysAllowed: 0, isPaid: true, description: '' });
  const limit = 20;
  const requestedDays = inclusiveDays(form.startDate, form.endDate);
  const selectedBalance = balances.find((item) => item.leaveTypeId === form.leaveTypeId);

  const stats = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'PENDING').length,
      approved: requests.filter((request) => request.status === 'APPROVED').length,
      rejected: requests.filter((request) => request.status === 'REJECTED').length,
    }),
    [requests]
  );

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [lrRes, empRes, ltRes] = await Promise.all([
        api.get('/hr/leave-requests', { params: { page, limit, status: statusFilter || undefined } }),
        api.get('/hr/employees', { params: { limit: 300 } }),
        api.get('/hr/leave-types'),
      ]);
      setRequests(lrRes.data?.data?.items || []);
      setTotal(lrRes.data?.data?.total || 0);
      setEmployees(empRes.data?.data?.items || []);
      setLeaveTypes(ltRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalances = async (employeeId: string, date?: string) => {
    if (!employeeId) return setBalances([]);
    try {
      const res = await api.get('/hr/leave-balances', {
        params: { employeeId, date: date || form.startDate || undefined },
      });
      setBalances(res.data?.data || []);
    } catch {
      setBalances([]);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBalances(form.employeeId, form.startDate);
  }, [form.employeeId, form.startDate]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!form.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!form.leaveTypeId) {
      toast.error('Please select a leave type');
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (requestedDays <= 0) {
      toast.error('End date cannot be before start date');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/hr/leave-requests', { ...form, days: requestedDays });
      showApiSuccess('Leave request created successfully');
      setShowModal(false);
      setForm({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setBalances([]);
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not create leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/hr/leave-requests/${id}/approve`, { status });
      showApiSuccess(status === 'APPROVED' ? 'Leave approved and ledger updated' : 'Leave request rejected');
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not update leave request');
    }
  };

  const createLeaveType = async () => {
    const trimmedName = leaveTypeForm.name.trim();
    if (!trimmedName) {
      toast.error('Leave type name is required');
      return;
    }

    try {
      const res = await api.post('/hr/leave-types', { ...leaveTypeForm, name: trimmedName });
      const created = res.data?.data;
      setLeaveTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, leaveTypeId: created.id }));
      setLeaveTypeForm({ name: '', daysAllowed: 0, isPaid: true, description: '' });
      setShowLeaveTypeForm(false);
      showApiSuccess(`Leave type "${trimmedName}" created`);
    } catch (err: any) {
      showApiError(err, 'Could not create leave type');
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (request: LeaveRequest) => (
        <span className="font-medium text-gray-900">{employeeName(request.employee)}</span>
      ),
    },
    { key: 'type', header: 'Leave Type', render: (request: LeaveRequest) => request.leaveType?.name || '-' },
    { key: 'startDate', header: 'From', render: (request: LeaveRequest) => formatDate(request.startDate) },
    { key: 'endDate', header: 'To', render: (request: LeaveRequest) => formatDate(request.endDate) },
    { key: 'days', header: 'Days' },
    { key: 'status', header: 'Status', render: (request: LeaveRequest) => <StatusBadge status={request.status} /> },
    {
      key: 'actions',
      header: '',
      render: (request: LeaveRequest) =>
        request.status === 'PENDING' ? (
          <div className="flex gap-1">
            <Button size="sm" variant="success" onClick={() => handleApprove(request.id, 'APPROVED')}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleApprove(request.id, 'REJECTED')}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave Management"
        description="Create leave requests for employees, review pending requests, and approve them into the leave ledger"
        action={{ label: 'Request for Employee', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Leave Types" value={leaveTypes.length} />
        <Metric label="Pending" value={stats.pending} />
        <Metric label="Approved On Page" value={stats.approved} />
        <Metric label="Rejected On Page" value={stats.rejected} />
      </div>
      <div className="flex flex-wrap gap-2">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status || 'All'}
          </Button>
        ))}
      </div>
      {requests.length === 0 && !isLoading ? (
        <EmptyState
          icon={Calendar}
          title="No leave requests"
          description="Create a leave request for an employee"
          action={{ label: 'Request for Employee', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={requests} isLoading={isLoading} />
          {total > limit && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / limit)}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Leave for Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Employee *">
                <Select
                  value={form.employeeId}
                  onValueChange={(employeeId) => setForm((prev) => ({ ...prev, employeeId, leaveTypeId: '' }))}
                >
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
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employeeName(employee)} ({employee.employeeId})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#4b5563]">Leave Type *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLeaveTypeForm((value) => !value)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New
                  </Button>
                </div>
                <Select
                  value={form.leaveTypeId}
                  onValueChange={(leaveTypeId) => setForm((prev) => ({ ...prev, leaveTypeId }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.length === 0 ? (
                      <SelectEmptyState
                        message="No leave types found"
                        linkHref="/hr/leave"
                        linkText="Create Leave Type"
                      />
                    ) : (
                      leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {showLeaveTypeForm && (
              <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3">
                <p className="mb-3 text-sm font-semibold text-[#1f2937]">Create Leave Type</p>
                <div className="grid gap-3 md:grid-cols-[1fr_140px_120px]">
                  <Input
                    placeholder="Casual Leave, Sick Leave..."
                    value={leaveTypeForm.name}
                    onChange={(event) => setLeaveTypeForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Days/year"
                    value={leaveTypeForm.daysAllowed}
                    onChange={(event) =>
                      setLeaveTypeForm((prev) => ({ ...prev, daysAllowed: Number(event.target.value) }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-[#374151]">
                    <input
                      type="checkbox"
                      checked={leaveTypeForm.isPaid}
                      onChange={(event) =>
                        setLeaveTypeForm((prev) => ({ ...prev, isPaid: event.target.checked }))
                      }
                    />
                    Paid
                  </label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    placeholder="Description"
                    value={leaveTypeForm.description}
                    onChange={(event) =>
                      setLeaveTypeForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                  <Button type="button" onClick={createLeaveType}>
                    Create Type
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="From *">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </Field>
              <Field label="To *">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Days">
                <Input value={requestedDays || ''} placeholder="Auto calculated" readOnly />
              </Field>
            </div>
            <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3">
              <p className="text-sm font-semibold text-[#1f2937]">Available Leave Balances</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {balances.length ? (
                  balances.map((balance) => (
                    <div
                      key={balance.allocationId}
                      className={`rounded-md border bg-white p-2 ${
                        balance.leaveTypeId === form.leaveTypeId ? 'border-[#2490ef]' : 'border-[#e5e2dc]'
                      }`}
                    >
                      <p className="text-xs text-[#6b7280]">{balance.leaveType?.name}</p>
                      <p className="text-sm font-semibold text-[#1f2937]">
                        {balance.remainingDays} days remaining
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#6b7280]">Select an employee to check current leave balance.</p>
                )}
              </div>
            </div>
            <Field label="Reason">
              <Textarea
                rows={2}
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Reason for leave"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || employees.length === 0}>
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
