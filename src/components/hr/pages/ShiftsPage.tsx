'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Clock, Moon, PlayCircle, Plus, UserRoundCheck, Users } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showApiError, showApiSuccess } from '@/lib/apiError';

type EmployeeOption = {
  id: string;
  employeeId: string;
  user?: { firstName: string; lastName: string; email?: string };
  department?: { name: string };
  position?: { title: string };
};

function fullName(employee?: EmployeeOption) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ShiftsPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [rosterDate, setRosterDate] = useState(today());
  const [shiftForm, setShiftForm] = useState<any>({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 10,
    isNightShift: false,
  });
  const [assignForm, setAssignForm] = useState<any>({
    employeeId: '',
    shiftTypeId: '',
    startDate: today(),
    endDate: '',
  });

  const activeAssignments = assignments.filter((item) => item.status === 'ACTIVE');
  const stats = useMemo(
    () => ({
      shiftTypes: shifts.length,
      activeAssignments: activeAssignments.length,
      rostered: roster.length,
      nightShifts: shifts.filter((item) => item.isNightShift).length,
    }),
    [shifts, activeAssignments.length, roster]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [employeeRes, shiftRes, assignmentRes, rosterRes] = await Promise.all([
        api.get('/hr/employees', { params: { limit: 500 } }),
        api.get('/hr/shift-types'),
        api.get('/hr/shift-assignments'),
        api.get('/hr/shift-roster', { params: { date: rosterDate } }),
      ]);
      setEmployees(employeeRes.data?.data?.items || []);
      setShifts(shiftRes.data?.data || []);
      setAssignments(assignmentRes.data?.data || []);
      setRoster(rosterRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load shift management');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [rosterDate]);

  const createShift = async () => {
    if (isSubmittingShift) return;
    const trimmedName = shiftForm.name.trim();
    if (!trimmedName) {
      toast.error('Shift name is required');
      return;
    }

    setIsSubmittingShift(true);
    try {
      await api.post('/hr/shift-types', { ...shiftForm, name: trimmedName });
      showApiSuccess(`Shift type "${trimmedName}" created`);
      setShiftForm({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 10, isNightShift: false });
      load();
    } catch (err: any) {
      showApiError(err, 'Could not create shift');
    } finally {
      setIsSubmittingShift(false);
    }
  };

  const assignShift = async () => {
    if (isSubmittingAssign) return;
    if (!assignForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!assignForm.shiftTypeId) {
      toast.error('Please select a shift type');
      return;
    }
    if (!assignForm.startDate) {
      toast.error('Start date is required');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      await api.post('/hr/shift-assignments', { ...assignForm, endDate: assignForm.endDate || undefined });
      showApiSuccess('Shift assigned successfully');
      setAssignForm({ employeeId: '', shiftTypeId: '', startDate: today(), endDate: '' });
      load();
    } catch (err: any) {
      showApiError(err, 'Could not assign shift');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const closeAssignment = async (assignment: any) => {
    try {
      await api.put(`/hr/shift-assignments/${assignment.id}`, { status: 'INACTIVE', endDate: today() });
      showApiSuccess('Assignment closed');
      load();
    } catch (err: any) {
      showApiError(err, 'Could not close assignment');
    }
  };

  const markAutoAttendance = async () => {
    try {
      const res = await api.post('/hr/shift-auto-attendance', { date: rosterDate });
      const data = res.data?.data;
      showApiSuccess(`Processed auto-attendance for ${data?.processed ?? 0} employees`);
      load();
    } catch (err: any) {
      showApiError(err, 'Could not process auto attendance');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shift Management"
        description="Define shifts, assign employees, view daily roster, and mark attendance from checkins"
      >
        <Button onClick={markAutoAttendance}>
          <PlayCircle className="mr-2 h-4 w-4" />
          Mark Auto Attendance
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <DeskStat label="Shift Types" value={stats.shiftTypes} icon={Clock} />
        <DeskStat label="Active Assignments" value={stats.activeAssignments} icon={UserRoundCheck} />
        <DeskStat label="Rostered Today" value={stats.rostered} icon={Users} />
        <DeskStat label="Night Shifts" value={stats.nightShifts} icon={Moon} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Shift Type</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Shift Name *">
                <Input
                  value={shiftForm.name}
                  onChange={(event) => setShiftForm((f: any) => ({ ...f, name: event.target.value }))}
                  placeholder="Morning, Evening, Night Support..."
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Start">
                  <Input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(event) => setShiftForm((f: any) => ({ ...f, startTime: event.target.value }))}
                  />
                </Field>
                <Field label="End">
                  <Input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(event) => setShiftForm((f: any) => ({ ...f, endTime: event.target.value }))}
                  />
                </Field>
                <Field label="Grace (min)">
                  <Input
                    type="number"
                    min={0}
                    value={shiftForm.graceMinutes}
                    onChange={(event) =>
                      setShiftForm((f: any) => ({ ...f, graceMinutes: Number(event.target.value) }))
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftForm.isNightShift}
                  onChange={(event) => setShiftForm((f: any) => ({ ...f, isNightShift: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span>Night shift crosses midnight</span>
              </label>
              <Button onClick={createShift} disabled={isSubmittingShift}>
                <Plus className="mr-2 h-4 w-4" />
                {isSubmittingShift ? 'Creating...' : 'Create Shift'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign Shift</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Employee *">
                <Select
                  value={assignForm.employeeId}
                  onValueChange={(employeeId) => setAssignForm((f: any) => ({ ...f, employeeId }))}
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
                          {fullName(employee)} - {employee.employeeId}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Shift Type *">
                <Select
                  value={assignForm.shiftTypeId}
                  onValueChange={(shiftTypeId) => setAssignForm((f: any) => ({ ...f, shiftTypeId }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.length === 0 ? (
                      <SelectEmptyState
                        message="No shift types found"
                        linkHref="/hr/shifts"
                        linkText="Create Shift Type"
                      />
                    ) : (
                      shifts
                        .filter((shift) => shift.isActive)
                        .map((shift) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {shift.name} ({shift.startTime}-{shift.endTime})
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date *">
                  <Input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(event) => setAssignForm((f: any) => ({ ...f, startDate: event.target.value }))}
                  />
                </Field>
                <Field label="End Date">
                  <Input
                    type="date"
                    value={assignForm.endDate}
                    onChange={(event) => setAssignForm((f: any) => ({ ...f, endDate: event.target.value }))}
                  />
                </Field>
              </div>
              <Button onClick={assignShift} disabled={isSubmittingAssign || employees.length === 0 || shifts.length === 0}>
                {isSubmittingAssign ? 'Assigning...' : 'Assign Shift'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Types</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={shifts}
                isLoading={isLoading}
                columns={[
                  { key: 'name', header: 'Shift' },
                  { key: 'time', header: 'Time', render: (row: any) => `${row.startTime} - ${row.endTime}` },
                  {
                    key: 'graceMinutes',
                    header: 'Grace',
                    render: (row: any) => `${row.graceMinutes || 0} min`,
                  },
                  {
                    key: 'isNightShift',
                    header: 'Night',
                    render: (row: any) => (row.isNightShift ? 'Yes' : 'No'),
                  },
                  { key: 'assignments', header: 'Assignments', render: (row: any) => row._count?.assignments || 0 },
                  {
                    key: 'isActive',
                    header: 'Status',
                    render: (row: any) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shift Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={assignments}
                isLoading={isLoading}
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row: any) => `${fullName(row.employee)} (${row.employee?.employeeId})`,
                  },
                  { key: 'shift', header: 'Shift', render: (row: any) => row.shiftType?.name || '-' },
                  {
                    key: 'range',
                    header: 'Range',
                    render: (row: any) =>
                      `${formatDate(row.startDate)} - ${row.endDate ? formatDate(row.endDate) : 'Ongoing'}`,
                  },
                  { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                  {
                    key: 'actions',
                    header: '',
                    render: (row: any) =>
                      row.status === 'ACTIVE' ? (
                        <Button size="sm" variant="outline" onClick={() => closeAssignment(row)}>
                          Close
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Daily Shift Roster</CardTitle>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#6b7280]" />
              <Input type="date" value={rosterDate} onChange={(event) => setRosterDate(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={roster}
            isLoading={isLoading}
            columns={[
              {
                key: 'employee',
                header: 'Employee',
                render: (row: any) => `${fullName(row.employee)} (${row.employee?.employeeId})`,
              },
              { key: 'department', header: 'Department', render: (row: any) => row.employee?.department?.name || '-' },
              { key: 'shift', header: 'Shift', render: (row: any) => row.shiftType?.name || '-' },
              {
                key: 'scheduled',
                header: 'Scheduled',
                render: (row: any) =>
                  `${formatDateTime(row.scheduledStart)} - ${formatDateTime(row.scheduledEnd)}`,
              },
              {
                key: 'checkIn',
                header: 'Check In',
                render: (row: any) => (row.attendance?.checkIn ? formatDateTime(row.attendance.checkIn) : '-'),
              },
              {
                key: 'checkOut',
                header: 'Check Out',
                render: (row: any) => (row.attendance?.checkOut ? formatDateTime(row.attendance.checkOut) : '-'),
              },
              { key: 'status', header: 'Attendance', render: (row: any) => <StatusBadge status={row.status} /> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DeskStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef6ff] text-[#1674c4]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-[#6b7280]">{label}</p>
          <p className="text-xl font-semibold text-[#1f2937]">{value}</p>
        </div>
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
