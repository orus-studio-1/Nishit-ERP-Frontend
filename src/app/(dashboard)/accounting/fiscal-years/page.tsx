'use client';

import { useEffect, useState } from 'react';
import { Plus, CalendarRange } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function FiscalYearsPage() {
  const [years, setYears] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingPeriodId, setTogglingPeriodId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounting/fiscal-years');
      setYears(res.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load fiscal years');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (isSubmitting) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error('Please enter a fiscal year name (e.g. FY 2026)');
      return;
    }
    if (!form.startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (!form.endDate) {
      toast.error('Please select an end date');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/accounting/fiscal-years', {
        ...form,
        name: trimmedName,
      });
      showApiSuccess(`Fiscal year "${trimmedName}" created successfully`);
      setForm({ name: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create fiscal year');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePeriod = async (period: any) => {
    if (togglingPeriodId) return;
    setTogglingPeriodId(period.id);
    try {
      await api.put(`/accounting/periods/${period.id}`, { isClosed: !period.isClosed });
      showApiSuccess(period.isClosed ? `Period "${period.name}" reopened` : `Period "${period.name}" closed`);
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to update period status');
    } finally {
      setTogglingPeriodId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fiscal Years"
        description="Control fiscal years and lock accounting periods"
      />

      <Card>
        <CardHeader>
          <CardTitle>New Fiscal Year</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              placeholder="e.g. FY 2026"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End Date *</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={isSubmitting} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {years.length === 0 && !isLoading ? (
        <EmptyState
          icon={CalendarRange}
          title="No fiscal years found"
          description="Create fiscal years and define reporting periods for your accounting operations."
        />
      ) : (
        <DataTable
          data={years}
          isLoading={isLoading}
          columns={[
            {
              key: 'name',
              header: 'Fiscal Year',
              render: (row: any) => <span className="font-medium">{row.name}</span>,
            },
            { key: 'startDate', header: 'Start', render: (row: any) => formatDate(row.startDate) },
            { key: 'endDate', header: 'End', render: (row: any) => formatDate(row.endDate) },
            {
              key: 'status',
              header: 'Status',
              render: (row: any) => <StatusBadge status={row.isClosed ? 'CANCELLED' : 'ACTIVE'} />,
            },
            {
              key: 'periods',
              header: 'Periods',
              render: (row: any) => (
                <div className="flex flex-wrap gap-1">
                  {row.periods?.map((p: any) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={p.isClosed ? 'outline' : 'secondary'}
                      disabled={togglingPeriodId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePeriod(p);
                      }}
                    >
                      {p.name}: {p.isClosed ? 'Closed' : 'Open'}
                    </Button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
