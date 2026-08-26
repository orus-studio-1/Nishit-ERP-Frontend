'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Check, XCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { Activity, Lead } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const types = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'FOLLOW_UP'];
const statuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [worklist, setWorklist] = useState<'all' | 'my-day' | 'overdue'>('all');
  const [showModal, setShowModal] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState({
    leadId: '',
    type: 'CALL',
    subject: '',
    description: '',
    dueDate: '',
    status: 'PLANNED',
  });
  const router = useRouter();
  const limit = 20;

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const path = worklist === 'my-day' ? '/crm/activities-my-day' : worklist === 'overdue' ? '/crm/activities-overdue' : '/crm/activities';
      const res = await api.get(path, { params: { page, limit, type: typeFilter || undefined } });
      const payload = res.data?.data;
      setActivities(Array.isArray(payload) ? payload : payload?.items || []);
      setTotal(Array.isArray(payload) ? payload.length : payload?.total || 0);
    } catch (err: any) {
      showApiError(err, 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/crm/leads', { params: { limit: 100 } });
      setLeads(res.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load leads list');
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, typeFilter, worklist]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.leadId) {
      toast.error('Please select a lead for this activity');
      return;
    }
    const trimmedSubject = form.subject.trim();
    if (!trimmedSubject) {
      toast.error('Please enter an activity subject');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/crm/activities', {
        ...form,
        subject: trimmedSubject,
        dueDate: form.dueDate || undefined,
      });
      showApiSuccess('Activity created successfully');
      setShowModal(false);
      setForm({ leadId: '', type: 'CALL', subject: '', description: '', dueDate: '', status: 'PLANNED' });
      fetchActivities();
    } catch (err: any) {
      showApiError(err, 'Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'type', header: 'Type', render: (a: Activity) => <StatusBadge status={a.type} /> },
    { key: 'subject', header: 'Subject', render: (a: Activity) => <span className="font-medium">{a.subject}</span> },
    { key: 'linked', header: 'Linked To', render: (a: Activity) => linkedLabel(a) },
    { key: 'status', header: 'Status', render: (a: Activity) => <StatusBadge status={a.status} /> },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (a: Activity) => (a.dueDate ? formatDateTime(a.dueDate) : '—'),
    },
    {
      key: 'description',
      header: 'Notes',
      render: (a: Activity) =>
        a.description ? a.description.slice(0, 60) + (a.description.length > 60 ? '…' : '') : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (a: Activity) =>
        !['COMPLETED', 'CANCELLED'].includes(a.status) ? (
          <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={() => completeActivity(a)}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => cancelActivity(a)}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ];

  const completeActivity = async (activity: Activity) => {
    try {
      await api.put(`/crm/activities/${activity.id}/complete`, {});
      showApiSuccess('Activity marked as completed');
      fetchActivities();
    } catch (err: any) {
      showApiError(err, 'Could not complete activity');
    }
  };

  const cancelActivity = async (activity: Activity) => {
    try {
      await api.put(`/crm/activities/${activity.id}/cancel`, { reason: 'Cancelled from activity list' });
      showApiSuccess('Activity cancelled');
      fetchActivities();
    } catch (err: any) {
      showApiError(err, 'Could not cancel activity');
    }
  };

  const openLinkedRecord = (activity: Activity) => {
    if (activity.leadId) router.push(`/crm/leads/${activity.leadId}`);
    else if (activity.opportunityId) router.push(`/crm/opportunities/${activity.opportunityId}`);
    else if (activity.contactId) router.push(`/crm/contacts/${activity.contactId}`);
    else if (activity.organizationId) router.push(`/crm/organizations/${activity.organizationId}`);
  };

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Track calls, emails, and meetings"
        action={{ label: 'Log Activity', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button variant={worklist === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setWorklist('all')}>All work</Button>
        <Button variant={worklist === 'my-day' ? 'default' : 'outline'} size="sm" onClick={() => setWorklist('my-day')}>My day</Button>
        <Button variant={worklist === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setWorklist('overdue')}>Overdue</Button>
        <Button
          variant={typeFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('')}
        >
          All
        </Button>
        {types.map((t) => (
          <Button
            key={t}
            variant={typeFilter === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {activities.length === 0 && !isLoading ? (
        <EmptyState
          icon={Calendar}
          title="No activities"
          description="Log your first CRM activity"
          action={{ label: 'Log Activity', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={activities} isLoading={isLoading} onRowClick={openLinkedRecord} />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>

          {leads.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No leads found. Create a lead first before logging activities.</span>
              </div>
              <Link
                href="/crm/leads"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Lead <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lead *</Label>
              <Select value={form.leadId} onValueChange={(v) => setForm((f) => ({ ...f, leadId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.length === 0 ? (
                    <SelectEmptyState
                      message="No leads found"
                      linkHref="/crm/leads"
                      linkText="Create Lead"
                    />
                  ) : (
                    leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input
                value={form.subject}
                placeholder="e.g. Initial Discovery Call"
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Meeting agenda, client notes, questions discussed..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || leads.length === 0}>
                {isSubmitting ? 'Saving...' : 'Save Activity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function linkedLabel(activity: Activity) {
  if (activity.lead) return <span>{activity.lead.title}</span>;
  if (activity.opportunity) return <span>{activity.opportunity.title}</span>;
  if (activity.contact) return <span>{activity.contact.firstName} {activity.contact.lastName}</span>;
  if (activity.organization) return <span>{activity.organization.name}</span>;
  return '—';
}
