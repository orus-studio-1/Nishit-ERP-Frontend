'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function CostCentersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', isGroup: false });

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounting/cost-centers');
      setItems(res.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load cost centers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (isSubmitting) return;

    const trimmedCode = form.code.trim();
    const trimmedName = form.name.trim();

    if (!trimmedCode) {
      toast.error('Please enter a cost center code');
      return;
    }
    if (!trimmedName) {
      toast.error('Please enter a cost center name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/accounting/cost-centers', {
        code: trimmedCode,
        name: trimmedName,
        isGroup: form.isGroup,
      });
      showApiSuccess(`Cost center "${trimmedCode} - ${trimmedName}" created successfully`);
      setForm({ code: '', name: '', isGroup: false });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create cost center');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost Centers"
        description="Track accounting by department, branch, project, or team"
      />

      <div className="grid gap-3 rounded-md border border-[#e5e2dc] bg-white p-4 md:grid-cols-4 shadow-xs">
        <div>
          <Label>Code *</Label>
          <Input
            value={form.code}
            placeholder="e.g. CC-SALES"
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
        </div>
        <div>
          <Label>Name *</Label>
          <Input
            value={form.name}
            placeholder="e.g. Sales Department"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <label className="flex items-end gap-2 text-sm pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isGroup}
            onChange={(e) => setForm((f) => ({ ...f, isGroup: e.target.checked }))}
          />{' '}
          Group Cost Center
        </label>
        <div className="flex items-end">
          <Button onClick={create} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating...' : 'Create Cost Center'}
          </Button>
        </div>
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Building2}
          title="No cost centers found"
          description="Create departments, branches, or project cost centers to track expenses accurately."
        />
      ) : (
        <DataTable
          data={items}
          isLoading={isLoading}
          columns={[
            {
              key: 'code',
              header: 'Code',
              render: (row: any) => <span className="font-mono font-medium">{row.code}</span>,
            },
            { key: 'name', header: 'Name' },
            {
              key: 'type',
              header: 'Type',
              render: (row: any) => (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    row.isGroup ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {row.isGroup ? 'Group' : 'Ledger'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: any) => (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {row.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
