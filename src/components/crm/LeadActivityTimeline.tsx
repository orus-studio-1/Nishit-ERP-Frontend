'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Check, Clock, Mail, MessageSquare, PhoneCall, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import api from '@/lib/api';
import { Activity, ActivityStatus, ActivityType } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';

import { showApiError, showApiSuccess } from '@/lib/apiError';

type ActivitySummary = {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  nextActivity?: Activity | null;
  lastCompleted?: Activity | null;
};

type ActivityResponse = {
  activities: Activity[];
  summary: ActivitySummary;
};

const activityTypes: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'FOLLOW_UP'];
const activityStatuses: ActivityStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const emptyForm = {
  type: 'CALL' as ActivityType,
  subject: '',
  description: '',
  dueDate: '',
  status: 'PLANNED' as ActivityStatus,
};

function activityIcon(type: ActivityType) {
  if (type === 'CALL') return PhoneCall;
  if (type === 'EMAIL') return Mail;
  if (type === 'MEETING') return Users;
  if (type === 'FOLLOW_UP') return RotateCcw;
  if (type === 'TASK') return Check;
  return MessageSquare;
}

function isOpen(status: ActivityStatus) {
  return !['COMPLETED', 'CANCELLED'].includes(status);
}

export function LeadActivityTimeline({ leadId, onChanged }: { leadId: string; onChanged?: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({ total: 0, open: 0, completed: 0, overdue: 0 });
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'COMPLETED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ data: ActivityResponse }>(`/crm/leads/${leadId}/activities`);
      setActivities(res.data?.data?.activities || []);
      setSummary(res.data?.data?.summary || { total: 0, open: 0, completed: 0, overdue: 0 });
    } catch (err: any) {
      showApiError(err, 'Failed to load lead activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [leadId]);

  const visibleActivities = useMemo(() => {
    if (filter === 'OPEN') return activities.filter((item) => isOpen(item.status));
    if (filter === 'COMPLETED') return activities.filter((item) => item.status === 'COMPLETED');
    return activities;
  }, [activities, filter]);

  const createActivity = async () => {
    const trimmedSubject = form.subject.trim();
    if (!trimmedSubject) return toast.error('Subject is required');
    setIsSaving(true);
    try {
      await api.post(`/crm/leads/${leadId}/activities`, {
        ...form,
        subject: trimmedSubject,
        dueDate: form.dueDate || undefined,
        status: form.type === 'NOTE' ? 'COMPLETED' : form.status,
      });
      setForm(emptyForm);
      showApiSuccess(form.type === 'NOTE' ? 'Note added' : 'Activity scheduled');
      await load();
      onChanged?.();
    } catch (err: any) {
      showApiError(err, 'Could not save activity');
    } finally {
      setIsSaving(false);
    }
  };

  const completeActivity = async (activity: Activity) => {
    const followUpSubject = window.prompt('Optional follow-up subject. Leave blank if no follow-up is needed.');
    let followUpDueDate = '';
    if (followUpSubject) followUpDueDate = window.prompt('Follow-up date/time in YYYY-MM-DD HH:mm format', '') || '';
    try {
      await api.put(`/crm/activities/${activity.id}/complete`, {
        followUpSubject: followUpSubject || undefined,
        followUpDueDate: followUpDueDate ? new Date(followUpDueDate).toISOString() : undefined,
      });
      showApiSuccess('Activity completed');
      await load();
      onChanged?.();
    } catch (err: any) {
      showApiError(err, 'Could not complete activity');
    }
  };

  const cancelActivity = async (activity: Activity) => {
    const reason = window.prompt('Cancel reason', 'No longer needed');
    if (reason === null) return;
    try {
      await api.put(`/crm/activities/${activity.id}/cancel`, { reason });
      showApiSuccess('Activity cancelled');
      await load();
      onChanged?.();
    } catch (err: any) {
      showApiError(err, 'Could not cancel activity');
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-[#ebe7df]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Lead Activities</CardTitle>
          <div className="flex rounded-md border border-[#d9d4cc] bg-white p-1">
            {(['ALL', 'OPEN', 'COMPLETED'] as const).map((item) => (
              <button
                key={item}
                className={`rounded px-3 py-1 text-xs font-medium ${filter === item ? 'bg-[#eef6ff] text-[#1674c4]' : 'text-[#64748b]'}`}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="grid gap-3 md:grid-cols-4">
          <ActivityStat label="Open" value={summary.open} tone="blue" />
          <ActivityStat label="Overdue" value={summary.overdue} tone="red" />
          <ActivityStat label="Completed" value={summary.completed} tone="green" />
          <ActivityStat label="Total" value={summary.total} tone="slate" />
        </div>

        <div className="grid gap-3 rounded-md border border-[#e5e2dc] bg-[#fbfbfa] p-3 lg:grid-cols-[140px_1fr_170px_130px_auto]">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(type: ActivityType) => setForm((prev) => ({ ...prev, type }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{activityTypes.map((type) => <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Call CFO, send proposal, note objection..." />
          </div>
          <div className="space-y-1.5">
            <Label>Due</Label>
            <Input type="datetime-local" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(status: ActivityStatus) => setForm((prev) => ({ ...prev, status }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{activityStatuses.filter((status) => status !== 'CANCELLED').map((status) => <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={createActivity} disabled={isSaving} className="w-full"><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
          <div className="lg:col-span-5">
            <Textarea rows={2} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Details, next step, customer objection, meeting notes..." />
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-md bg-[#f4f5f6]" />)
          ) : visibleActivities.length ? visibleActivities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} onComplete={() => completeActivity(activity)} onCancel={() => cancelActivity(activity)} />
          )) : (
            <div className="rounded-md border border-dashed border-[#d9d4cc] p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-[#8a929d]" />
              <p className="mt-2 text-sm font-medium text-[#1f2937]">No activities in this view</p>
              <p className="text-sm text-[#6b7280]">Log calls, emails, meetings, notes, and follow-ups from this lead.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityStat({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'red' | 'green' | 'slate' }) {
  const classes = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    green: 'border-green-100 bg-green-50 text-green-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
  };
  return <div className={`rounded-md border p-3 ${classes[tone]}`}><p className="text-xs">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function ActivityRow({ activity, onComplete, onCancel }: { activity: Activity; onComplete: () => void; onCancel: () => void }) {
  const Icon = activityIcon(activity.type);
  const overdue = isOpen(activity.status) && activity.dueDate && new Date(activity.dueDate) < new Date();
  return (
    <div className={`rounded-md border p-3 ${overdue ? 'border-red-200 bg-red-50/50' : 'border-[#e5e2dc] bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9d4cc] bg-[#f8faf9]">
            <Icon className="h-4 w-4 text-[#4b5563]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={activity.type} />
              <StatusBadge status={activity.status} />
              {overdue && <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Overdue</span>}
            </div>
            <p className="mt-1 font-medium text-[#1f2937]">{activity.subject}</p>
            {activity.description && <p className="mt-1 text-sm text-[#4b5563]">{activity.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{activity.dueDate ? `Due ${formatDateTime(activity.dueDate)}` : `Logged ${formatDateTime(activity.createdAt)}`}</span>
              {activity.completedAt && <span>Completed {formatDateTime(activity.completedAt)}</span>}
              {activity.user && <span>by {activity.user.firstName} {activity.user.lastName}</span>}
            </div>
          </div>
        </div>
        {isOpen(activity.status) && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onComplete}><Check className="mr-1 h-3.5 w-3.5" />Complete</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}><Trash2 className="mr-1 h-3.5 w-3.5" />Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}
