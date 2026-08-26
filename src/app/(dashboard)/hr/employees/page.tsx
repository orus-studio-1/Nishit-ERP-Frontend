'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import api from '@/lib/api';
import { Employee, Department, Position } from '@/types';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    positionId: '',
    hireDate: new Date().toISOString().split('T')[0],
    salary: '',
    salaryType: 'MONTHLY',
    address: '',
    city: '',
    country: '',
    emergencyName: '',
    emergencyPhone: '',
    roleIds: [] as string[],
  });
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', description: '' });
  const [positionForm, setPositionForm] = useState({ title: '', departmentId: '', description: '', minSalary: '', maxSalary: '' });
  const limit = 20;

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [empRes, deptRes, posRes, rolesRes] = await Promise.all([
        api.get('/hr/employees', { params: { page, limit, search: search || undefined } }),
        api.get('/hr/departments'),
        api.get('/hr/positions'),
        api.get('/access/roles').catch(() => ({ data: { data: [] } })),
      ]);
      setEmployees(empRes.data?.data?.items || []);
      setTotal(empRes.data?.data?.total || 0);
      setDepartments(deptRes.data?.data || []);
      setPositions(posRes.data?.data || []);
      setRoles(rolesRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName) {
      toast.error('First and last name are required');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Email address is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/hr/employees', {
        ...form,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        salary: Number(form.salary || 0),
        departmentId: form.departmentId || undefined,
        positionId: form.positionId || undefined,
      });
      showApiSuccess('Employee created. Issue login password from Access Control.');
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        positionId: '',
        hireDate: new Date().toISOString().split('T')[0],
        salary: '',
        salaryType: 'MONTHLY',
        address: '',
        city: '',
        country: '',
        emergencyName: '',
        emergencyPhone: '',
        roleIds: [],
      });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDepartment = async () => {
    const trimmedName = departmentForm.name.trim();
    const trimmedCode = departmentForm.code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      toast.error('Department name and code are required');
      return;
    }

    try {
      const res = await api.post('/hr/departments', { ...departmentForm, name: trimmedName, code: trimmedCode });
      const created = res.data?.data;
      setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, departmentId: created.id, positionId: '' }));
      setPositionForm((f) => ({ ...f, departmentId: created.id }));
      setDepartmentForm({ name: '', code: '', description: '' });
      setShowDepartmentForm(false);
      showApiSuccess(`Department "${trimmedName}" created`);
    } catch (err: any) {
      showApiError(err, 'Failed to create department');
    }
  };

  const handleQuickPosition = async () => {
    const departmentId = positionForm.departmentId || form.departmentId;
    if (!departmentId) {
      toast.error('Select or create a department first');
      return;
    }
    const trimmedTitle = positionForm.title.trim();
    if (!trimmedTitle) {
      toast.error('Position title is required');
      return;
    }

    try {
      const res = await api.post('/hr/positions', {
        ...positionForm,
        title: trimmedTitle,
        departmentId,
        minSalary: positionForm.minSalary ? Number(positionForm.minSalary) : undefined,
        maxSalary: positionForm.maxSalary ? Number(positionForm.maxSalary) : undefined,
      });
      const created = res.data?.data;
      setPositions((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      setForm((f) => ({ ...f, departmentId, positionId: created.id }));
      setPositionForm({ title: '', departmentId, description: '', minSalary: '', maxSalary: '' });
      setShowPositionForm(false);
      showApiSuccess(`Position "${trimmedTitle}" created`);
    } catch (err: any) {
      showApiError(err, 'Failed to create position');
    }
  };

  const filteredPositions = form.departmentId ? positions.filter((p) => p.departmentId === form.departmentId) : positions;

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (e: Employee) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{getInitials(e.user.firstName, e.user.lastName)}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {e.user.firstName} {e.user.lastName}
            </p>
            <p className="text-xs text-gray-400">{e.employeeId}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (e: Employee) => e.user.email },
    { key: 'department', header: 'Department', render: (e: Employee) => e.department?.name || '—' },
    { key: 'position', header: 'Position', render: (e: Employee) => e.position?.title || '—' },
    { key: 'salary', header: 'Salary', render: (e: Employee) => formatCurrency(e.salary) },
    { key: 'hireDate', header: 'Hire Date', render: (e: Employee) => formatDate(e.hireDate) },
    { key: 'status', header: 'Status', render: (e: Employee) => <StatusBadge status={e.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your workforce"
        action={{ label: 'New Employee', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="mb-4">
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>
      {employees.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add your first employee"
          action={{ label: 'Add Employee', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={employees} isLoading={isLoading} />
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                placeholder="e.g. John"
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                placeholder="e.g. Doe"
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john.doe@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                placeholder="+91 98765 43210"
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Department</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDepartmentForm((v) => !v)}
                >
                  <Building2 className="mr-1 h-3.5 w-3.5" />
                  New
                </Button>
              </div>
              <Select
                value={form.departmentId}
                onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectEmptyState
                      message="No departments found"
                      linkHref="/hr/departments"
                      linkText="Create Department"
                    />
                  ) : (
                    departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Position</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPositionForm((v) => !v)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  New
                </Button>
              </div>
              <Select
                value={form.positionId}
                onValueChange={(v) => setForm((f) => ({ ...f, positionId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.departmentId ? 'Select position' : 'Select department first'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPositions.length === 0 ? (
                    <SelectEmptyState
                      message="No positions found"
                      linkHref="/hr/positions"
                      linkText="Create Position"
                    />
                  ) : (
                    filteredPositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {showDepartmentForm && (
              <div className="col-span-2 rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3">
                <p className="mb-3 text-sm font-semibold text-[#1f2937]">Create Department</p>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <Input
                    placeholder="Department name"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Code"
                    value={departmentForm.code}
                    onChange={(e) => setDepartmentForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" size="sm" onClick={handleQuickDepartment}>
                    Create Department
                  </Button>
                </div>
              </div>
            )}
            {showPositionForm && (
              <div className="col-span-2 rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3">
                <p className="mb-3 text-sm font-semibold text-[#1f2937]">Create Position</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Position title"
                    value={positionForm.title}
                    onChange={(e) => setPositionForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <Select
                    value={positionForm.departmentId || form.departmentId}
                    onValueChange={(v) => setPositionForm((f) => ({ ...f, departmentId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" size="sm" onClick={handleQuickPosition}>
                    Create Position
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Hire Date *</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salary *</Label>
              <Input
                type="number"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salary Type</Label>
              <Select
                value={form.salaryType}
                onValueChange={(v) => setForm((f) => ({ ...f, salaryType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['HOURLY', 'DAILY', 'MONTHLY', 'ANNUAL'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1674c4]" />
                <Label>Access Roles</Label>
              </div>
              <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[#e5e2dc] p-2">
                {roles.length ? (
                  roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm text-[#374151]">
                      <input
                        type="checkbox"
                        checked={form.roleIds.includes(role.id)}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            roleIds: f.roleIds.includes(role.id)
                              ? f.roleIds.filter((id) => id !== role.id)
                              : [...f.roleIds, role.id],
                          }))
                        }
                      />
                      {role.title || role.name}
                    </label>
                  ))
                ) : (
                  <p className="col-span-2 text-sm text-[#6b7280]">
                    No access roles visible. The backend will assign Employee Self Service by default.
                  </p>
                )}
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                placeholder="Street address"
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                placeholder="City"
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.country}
                placeholder="Country"
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergencyName}
                placeholder="Contact name"
                onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Phone</Label>
              <Input
                value={form.emergencyPhone}
                placeholder="Contact phone"
                onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
