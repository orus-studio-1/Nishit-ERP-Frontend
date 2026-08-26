'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showApiError, showApiSuccess } from '@/lib/apiError';

type EmployeeOption = {
  id: string;
  employeeId: string;
  salary?: number;
  user?: { firstName: string; lastName: string };
};

const componentTypes = ['EARNING', 'DEDUCTION', 'TAX', 'BENEFIT'];

function fullName(employee?: EmployeeOption) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

export function SalaryStructuresPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComponent, setIsSubmittingComponent] = useState(false);
  const [isSubmittingStructure, setIsSubmittingStructure] = useState(false);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const [componentForm, setComponentForm] = useState<any>({
    name: '',
    type: 'EARNING',
    defaultAmount: '',
    formula: '',
    isTaxable: false,
    description: '',
  });
  const [structureForm, setStructureForm] = useState<any>({
    name: '',
    description: '',
    currency: 'INR',
  });
  const [structureRows, setStructureRows] = useState<any[]>([{ salaryComponentId: '', amount: '', formula: '' }]);
  const [assignForm, setAssignForm] = useState<any>({
    employeeId: '',
    salaryStructureId: '',
    baseSalary: '',
    fromDate: new Date().toISOString().slice(0, 10),
  });

  const selectedEmployee = employees.find((employee) => employee.id === assignForm.employeeId);
  const structurePreview = useMemo(() => {
    return structureRows.reduce(
      (acc, row) => {
        const component = components.find((item) => item.id === row.salaryComponentId);
        const amount = Number(row.amount || component?.defaultAmount || 0);
        if (['EARNING', 'BENEFIT'].includes(component?.type)) acc.gross += amount;
        if (['DEDUCTION', 'TAX'].includes(component?.type)) acc.deduction += amount;
        return acc;
      },
      { gross: 0, deduction: 0 }
    );
  }, [structureRows, components]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [employeeRes, componentRes, structureRes] = await Promise.all([
        api.get('/hr/employees', { params: { limit: 500 } }),
        api.get('/hr/salary-components'),
        api.get('/hr/salary-structures'),
      ]);
      setEmployees(employeeRes.data?.data?.items || []);
      setComponents(componentRes.data?.data || []);
      setStructures(structureRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load salary setup');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createComponent = async () => {
    if (isSubmittingComponent) return;
    const trimmedName = componentForm.name.trim();
    if (!trimmedName) {
      toast.error('Component name is required');
      return;
    }

    setIsSubmittingComponent(true);
    try {
      await api.post('/hr/salary-components', {
        ...componentForm,
        name: trimmedName,
        defaultAmount: componentForm.defaultAmount === '' ? undefined : Number(componentForm.defaultAmount),
      });
      showApiSuccess(`Salary component "${trimmedName}" created`);
      setComponentForm({ name: '', type: 'EARNING', defaultAmount: '', formula: '', isTaxable: false, description: '' });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not create component');
    } finally {
      setIsSubmittingComponent(false);
    }
  };

  const createStructure = async () => {
    if (isSubmittingStructure) return;
    const rows = structureRows.filter((row) => row.salaryComponentId);
    const trimmedName = structureForm.name.trim();
    if (!trimmedName) {
      toast.error('Structure name is required');
      return;
    }
    if (!rows.length) {
      toast.error('Add at least one component to the structure');
      return;
    }

    setIsSubmittingStructure(true);
    try {
      await api.post('/hr/salary-structures', {
        ...structureForm,
        name: trimmedName,
        components: rows.map((row) => ({
          salaryComponentId: row.salaryComponentId,
          amount: row.amount === '' ? 0 : Number(row.amount),
          formula: row.formula || undefined,
        })),
      });
      showApiSuccess(`Salary structure "${trimmedName}" created`);
      setStructureForm({ name: '', description: '', currency: 'INR' });
      setStructureRows([{ salaryComponentId: '', amount: '', formula: '' }]);
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not create structure');
    } finally {
      setIsSubmittingStructure(false);
    }
  };

  const assign = async () => {
    if (isSubmittingAssign) return;
    if (!assignForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!assignForm.salaryStructureId) {
      toast.error('Please select a salary structure');
      return;
    }
    if (!assignForm.fromDate) {
      toast.error('Effective from date is required');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      await api.post('/hr/salary-structure-assignments', {
        ...assignForm,
        baseSalary: assignForm.baseSalary === '' ? selectedEmployee?.salary || 0 : Number(assignForm.baseSalary),
      });
      showApiSuccess('Salary structure assigned successfully');
      setAssignForm({
        employeeId: '',
        salaryStructureId: '',
        baseSalary: '',
        fromDate: new Date().toISOString().slice(0, 10),
      });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Could not assign structure');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary Structures"
        description="Define salary components, build reusable salary structures, and assign them to employees"
      />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Salary Component Master</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Component Name *">
              <Input
                value={componentForm.name}
                onChange={(event) => setComponentForm((prev: any) => ({ ...prev, name: event.target.value }))}
                placeholder="Basic, HRA, PF, Income Tax..."
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select
                  value={componentForm.type}
                  onValueChange={(type) => setComponentForm((prev: any) => ({ ...prev, type }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {componentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default Amount">
                <Input
                  type="number"
                  placeholder="0"
                  value={componentForm.defaultAmount}
                  onChange={(event) =>
                    setComponentForm((prev: any) => ({ ...prev, defaultAmount: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Formula">
              <Input
                value={componentForm.formula}
                onChange={(event) => setComponentForm((prev: any) => ({ ...prev, formula: event.target.value }))}
                placeholder="base * 0.4, gross * 0.12"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={componentForm.isTaxable}
                onChange={(event) => setComponentForm((prev: any) => ({ ...prev, isTaxable: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span>Taxable component</span>
            </label>
            <Field label="Description">
              <Textarea
                rows={2}
                value={componentForm.description}
                onChange={(event) =>
                  setComponentForm((prev: any) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Notes on component statutory rules or calculations"
              />
            </Field>
            <Button onClick={createComponent} disabled={isSubmittingComponent}>
              {isSubmittingComponent ? 'Creating...' : 'Create Component'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build Salary Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Structure Name *">
                <Input
                  value={structureForm.name}
                  placeholder="e.g. Standard Executive CTC"
                  onChange={(event) => setStructureForm((prev: any) => ({ ...prev, name: event.target.value }))}
                />
              </Field>
              <Field label="Currency">
                <CurrencySelect
                  value={structureForm.currency}
                  onChange={(currency) => setStructureForm((prev: any) => ({ ...prev, currency }))}
                />
              </Field>
              <Field label="Description">
                <Input
                  value={structureForm.description}
                  placeholder="Grade level, band or role summary"
                  onChange={(event) =>
                    setStructureForm((prev: any) => ({ ...prev, description: event.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="rounded-md border border-[#e5e2dc]">
              <table className="w-full text-sm">
                <thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2 text-left">Component</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Formula Override</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {structureRows.map((row, index) => (
                    <tr key={index} className="border-t border-[#ece8e1]">
                      <td className="px-3 py-2">
                        <Select
                          value={row.salaryComponentId}
                          onValueChange={(salaryComponentId) =>
                            setStructureRows((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, salaryComponentId } : item))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select component" />
                          </SelectTrigger>
                          <SelectContent>
                            {components.length === 0 ? (
                              <SelectEmptyState
                                message="No components found"
                                linkHref="/hr/salary-structures"
                                linkText="Create Component"
                              />
                            ) : (
                              components.map((component) => (
                                <SelectItem key={component.id} value={component.id}>
                                  {component.name} ({component.type})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-right"
                          type="number"
                          value={row.amount}
                          onChange={(event) =>
                            setStructureRows((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, amount: event.target.value } : item))
                            )
                          }
                          placeholder="0 means base/default for earnings"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.formula}
                          onChange={(event) =>
                            setStructureRows((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, formula: event.target.value } : item))
                            )
                          }
                          placeholder="base * 0.5"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStructureRows((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setStructureRows((prev) => [...prev, { salaryComponentId: '', amount: '', formula: '' }])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
              <div className="text-sm text-[#4b5563]">
                Preview Gross {formatCurrency(structurePreview.gross, structureForm.currency)} / Deduction{' '}
                {formatCurrency(structurePreview.deduction, structureForm.currency)}
              </div>
              <Button onClick={createStructure} disabled={isSubmittingStructure}>
                {isSubmittingStructure ? 'Creating...' : 'Create Structure'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Structure to Employee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1.4fr_1.4fr_1fr_1fr_auto]">
          <Field label="Employee *">
            <Select
              value={assignForm.employeeId}
              onValueChange={(employeeId) =>
                setAssignForm((prev: any) => ({
                  ...prev,
                  employeeId,
                  baseSalary: employees.find((item) => item.id === employeeId)?.salary || '',
                }))
              }
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
                      {fullName(employee)} ({employee.employeeId})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Salary Structure *">
            <Select
              value={assignForm.salaryStructureId}
              onValueChange={(salaryStructureId) =>
                setAssignForm((prev: any) => ({ ...prev, salaryStructureId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select structure" />
              </SelectTrigger>
              <SelectContent>
                {structures.length === 0 ? (
                  <SelectEmptyState
                    message="No structures found"
                    linkHref="/hr/salary-structures"
                    linkText="Create Structure"
                  />
                ) : (
                  structures.map((structure) => (
                    <SelectItem key={structure.id} value={structure.id}>
                      {structure.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Base Salary">
            <Input
              type="number"
              placeholder="e.g. 50000"
              value={assignForm.baseSalary}
              onChange={(event) => setAssignForm((prev: any) => ({ ...prev, baseSalary: event.target.value }))}
            />
          </Field>
          <Field label="From Date *">
            <Input
              type="date"
              value={assignForm.fromDate}
              onChange={(event) => setAssignForm((prev: any) => ({ ...prev, fromDate: event.target.value }))}
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={assign} disabled={isSubmittingAssign || employees.length === 0 || structures.length === 0}>
              {isSubmittingAssign ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          data={components}
          isLoading={isLoading}
          columns={[
            { key: 'name', header: 'Component' },
            { key: 'type', header: 'Type', render: (row: any) => <StatusBadge status={row.type} /> },
            {
              key: 'defaultAmount',
              header: 'Default',
              render: (row: any) => (row.defaultAmount ? formatCurrency(Number(row.defaultAmount)) : '-'),
            },
            { key: 'formula', header: 'Formula', render: (row: any) => row.formula || '-' },
            { key: 'isTaxable', header: 'Taxable', render: (row: any) => (row.isTaxable ? 'Yes' : 'No') },
          ]}
        />
        <DataTable
          data={structures}
          isLoading={isLoading}
          columns={[
            { key: 'name', header: 'Structure' },
            { key: 'currency', header: 'Currency' },
            { key: 'components', header: 'Components', render: (row: any) => row.components?.length || 0 },
            { key: 'assignments', header: 'Assignments', render: (row: any) => row._count?.assignments || 0 },
          ]}
        />
      </div>
    </div>
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
