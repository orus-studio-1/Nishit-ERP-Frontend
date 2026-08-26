'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUpRight, BriefcaseBusiness, Plus } from 'lucide-react';
import api from '@/lib/api';
import { Department, Position } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', departmentId: '', description: '', minSalary: '', maxSalary: '' });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [posRes, deptRes] = await Promise.all([api.get('/hr/positions'), api.get('/hr/departments')]);
      setPositions(posRes.data?.data || []);
      setDepartments(deptRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load positions and departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toast.error('Please enter position title');
      return;
    }
    if (!form.departmentId) {
      toast.error('Please select a department for this position');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/hr/positions', {
        ...form,
        title: trimmedTitle,
        minSalary: form.minSalary ? Number(form.minSalary) : undefined,
        maxSalary: form.maxSalary ? Number(form.maxSalary) : undefined,
      });
      showApiSuccess(`Position "${trimmedTitle}" created successfully`);
      setShowModal(false);
      setForm({ title: '', departmentId: '', description: '', minSalary: '', maxSalary: '' });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to create position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Position', render: (p: Position) => <span className="font-medium text-gray-900">{p.title}</span> },
    { key: 'department', header: 'Department', render: (p: Position) => p.department?.name || '-' },
    { key: 'minSalary', header: 'Min Salary', render: (p: Position) => p.minSalary ? `₹ ${Number(p.minSalary).toLocaleString('en-IN')}` : '-' },
    { key: 'maxSalary', header: 'Max Salary', render: (p: Position) => p.maxSalary ? `₹ ${Number(p.maxSalary).toLocaleString('en-IN')}` : '-' },
    { key: 'employees', header: 'Employees', render: (p: any) => p._count?.employees || 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Positions"
        description="Define job titles under departments before assigning employees"
        action={{ label: 'New Position', icon: Plus, onClick: () => setShowModal(true) }}
      />
      {positions.length === 0 && !isLoading ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No positions yet"
          description="Create departments first, then define positions under them"
          action={{ label: 'Create Position', onClick: () => setShowModal(true) }}
        />
      ) : (
        <DataTable columns={columns} data={positions as any[]} isLoading={isLoading} />
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Position</DialogTitle>
          </DialogHeader>

          {departments.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No departments found. Create a department first to organize positions.</span>
              </div>
              <Link
                href="/hr/departments"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Department <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="e.g. Accounts Executive, HR Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select
                value={form.departmentId}
                onValueChange={(value) => setForm((f) => ({ ...f, departmentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={departments.length ? 'Select department' : 'Create a department first'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectEmptyState
                      message="No departments found"
                      linkHref="/hr/departments"
                      linkText="Create Department"
                    />
                  ) : (
                    departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Salary</Label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={form.minSalary}
                  onChange={(e) => setForm((f) => ({ ...f, minSalary: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Salary</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={form.maxSalary}
                  onChange={(e) => setForm((f) => ({ ...f, maxSalary: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Job description, role duties, or level overview"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || departments.length === 0}>
                {isSubmitting ? 'Creating...' : 'Create Position'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
