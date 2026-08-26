'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUpRight, CheckCircle2, Edit2, GitBranch, Play, Plus, Route, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { CrmAssignmentRule, LeadSource } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const sources: LeadSource[] = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'ADVERTISEMENT', 'CSV_IMPORT', 'OTHER'];
const blankForm = { id: '', name: '', priority: '100', source: 'ANY', city: '', country: '', minValue: '', maxValue: '', assignToId: '', isActive: true };
const blankTest = { source: 'WEBSITE', city: '', country: '', value: '' };

type Rule = CrmAssignmentRule & { matchedLeadCount?: number; routedLeadCount?: number };

function userName(user?: any) {
  return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '-';
}

function ruleConditions(rule: Rule) {
  const conditions = [
    rule.source ? `Source is ${rule.source}` : 'Any source',
    rule.city ? `City is ${rule.city}` : '',
    rule.country ? `Country is ${rule.country}` : '',
    rule.minValue !== null && rule.minValue !== undefined ? `Value >= ${rule.minValue}` : '',
    rule.maxValue !== null && rule.maxValue !== undefined ? `Value <= ${rule.maxValue}` : '',
  ].filter(Boolean);
  return conditions.join(' · ');
}

export default function AssignmentRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [testForm, setTestForm] = useState(blankTest);
  const [testResult, setTestResult] = useState<any>(null);

  const metrics = useMemo(() => ({
    total: rules.length,
    active: rules.filter((rule) => rule.isActive).length,
    matched: rules.reduce((sum, rule) => sum + Number(rule.matchedLeadCount || 0), 0),
  }), [rules]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [ruleRes, userRes] = await Promise.all([
        api.get('/crm/assignment-rules'),
        api.get('/access/users'),
      ]);
      setRules(ruleRes.data?.data?.items || []);
      setUsers(userRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load assignment rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const payload = () => ({
    ...form,
    priority: Number(form.priority || 100),
    source: form.source === 'ANY' ? undefined : form.source,
    city: form.city || undefined,
    country: form.country || undefined,
    minValue: form.minValue === '' ? undefined : Number(form.minValue),
    maxValue: form.maxValue === '' ? undefined : Number(form.maxValue),
  });

  const resetForm = () => setForm(blankForm);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error('Please enter a rule name');
      return;
    }
    if (!form.assignToId) {
      toast.error('Please select an assignee user for this rule');
      return;
    }
    const priorityNum = Number(form.priority);
    if (Number.isNaN(priorityNum) || priorityNum < 1) {
      toast.error('Priority must be 1 or higher');
      return;
    }

    setIsSaving(true);
    try {
      if (form.id) {
        await api.put(`/crm/assignment-rules/${form.id}`, { ...payload(), name: trimmedName });
      } else {
        await api.post('/crm/assignment-rules', { ...payload(), name: trimmedName });
      }
      showApiSuccess(form.id ? 'Assignment rule updated' : 'Assignment rule created');
      resetForm();
      load();
    } catch (err: any) {
      showApiError(err, 'Could not save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (rule: Rule) => {
    setForm({
      id: rule.id,
      name: rule.name,
      priority: String(rule.priority || 100),
      source: rule.source || 'ANY',
      city: rule.city || '',
      country: rule.country || '',
      minValue: rule.minValue === null || rule.minValue === undefined ? '' : String(rule.minValue),
      maxValue: rule.maxValue === null || rule.maxValue === undefined ? '' : String(rule.maxValue),
      assignToId: rule.assignToId,
      isActive: rule.isActive,
    });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this assignment rule? Existing leads keep their current assignee.')) return;
    try {
      await api.delete(`/crm/assignment-rules/${id}`);
      showApiSuccess('Assignment rule deleted');
      load();
    } catch (err: any) {
      showApiError(err, 'Could not delete rule');
    }
  };

  const testRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsTesting(true);
    try {
      const res = await api.post('/crm/assignment-rules/test', {
        ...testForm,
        value: testForm.value === '' ? undefined : Number(testForm.value),
      });
      setTestResult(res.data?.data);
      showApiSuccess('Assignment rule evaluated');
    } catch (err: any) {
      showApiError(err, 'Could not test rule');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assignment Rules"
        description="Route new and imported leads to the right salesperson by source, territory, and deal value."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total Rules" value={metrics.total} />
        <StatCard label="Active Routing Rules" value={metrics.active} />
        <StatCard label="Matching Existing Leads" value={metrics.matched} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="h-4 w-4" />
              {form.id ? 'Edit Assignment Rule' : 'New Assignment Rule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 && !isLoading && (
              <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>No team members found in access control to assign leads to.</span>
                </div>
                <Link
                  href="/settings/access"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
                >
                  Manage Users <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            <form onSubmit={save} className="grid gap-4 md:grid-cols-4">
              <Field label="Rule Name *" className="md:col-span-2">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. High value website leads"
                  required
                />
              </Field>
              <Field label="Priority">
                <Input
                  type="number"
                  min="1"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                />
              </Field>
              <Field label="Status">
                <ToggleActive
                  checked={form.isActive}
                  onChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
                />
              </Field>
              <Field label="Source">
                <SourceSelect
                  value={form.source}
                  onChange={(source) => setForm((f) => ({ ...f, source }))}
                  includeAny
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Country">
                <Input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Min Value">
                <Input
                  type="number"
                  min="0"
                  value={form.minValue}
                  onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
                />
              </Field>
              <Field label="Max Value">
                <Input
                  type="number"
                  min="0"
                  value={form.maxValue}
                  onChange={(e) => setForm((f) => ({ ...f, maxValue: e.target.value }))}
                />
              </Field>
              <Field label="Assign To *" className="md:col-span-2">
                <Select
                  value={form.assignToId}
                  onValueChange={(assignToId) => setForm((f) => ({ ...f, assignToId }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee/user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.length === 0 ? (
                      <SelectEmptyState
                        message="No users found"
                        linkHref="/settings/access"
                        linkText="Manage Users"
                      />
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {userName(user)} · {user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving || users.length === 0} className="min-w-32">
                  {form.id ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {form.id ? (isSaving ? 'Saving...' : 'Save Rule') : isSaving ? 'Adding...' : 'Add Rule'}
                </Button>
                {form.id && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="h-4 w-4" />
              Rule Tester
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={testRule} className="grid gap-3 sm:grid-cols-2">
              <Field label="Source">
                <SourceSelect
                  value={testForm.source}
                  onChange={(source) => setTestForm((f) => ({ ...f, source }))}
                />
              </Field>
              <Field label="Deal Value">
                <Input
                  type="number"
                  min="0"
                  value={testForm.value}
                  onChange={(e) => setTestForm((f) => ({ ...f, value: e.target.value }))}
                />
              </Field>
              <Field label="City">
                <Input
                  value={testForm.city}
                  onChange={(e) => setTestForm((f) => ({ ...f, city: e.target.value }))}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={testForm.country}
                  onChange={(e) => setTestForm((f) => ({ ...f, country: e.target.value }))}
                />
              </Field>
              <Button className="sm:col-span-2" variant="outline" disabled={isTesting}>
                <GitBranch className="mr-2 h-4 w-4" />
                {isTesting ? 'Testing...' : 'Test Assignment'}
              </Button>
            </form>
            {testResult && (
              <div className="mt-4 rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm">
                {testResult.matched ? (
                  <div className="space-y-1">
                    <Badge variant="success">Matched</Badge>
                    <p className="font-medium text-[#1f2937]">{testResult.rule.name}</p>
                    <p className="text-[#6b7280]">
                      Assigns to {userName(testResult.assignTo)} after checking {testResult.evaluatedRules} active
                      rule(s).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Badge variant="warning">No Match</Badge>
                    <p className="text-[#6b7280]">
                      This lead will stay unassigned unless the creator is used as fallback.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        isLoading={isLoading}
        data={rules}
        emptyMessage="No assignment rules yet"
        columns={[
          {
            key: 'priority',
            header: 'Order',
            render: (rule: Rule) => <span className="font-semibold">#{rule.priority}</span>,
          },
          {
            key: 'name',
            header: 'Rule',
            render: (rule: Rule) => (
              <div>
                <p className="font-medium text-[#1f2937]">{rule.name}</p>
                <p className="text-xs text-[#6b7280]">{ruleConditions(rule)}</p>
              </div>
            ),
          },
          {
            key: 'assignTo',
            header: 'Assignee',
            render: (rule: Rule) => (
              <div>
                <p>{userName(rule.assignTo)}</p>
                <p className="text-xs text-[#8a929d]">{rule.assignTo?.email}</p>
              </div>
            ),
          },
          {
            key: 'impact',
            header: 'Impact',
            render: (rule: Rule) => (
              <span>
                {rule.matchedLeadCount || 0} matching · {rule.routedLeadCount || 0} routed
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (rule: Rule) => (
              <Badge variant={rule.isActive ? 'success' : 'secondary'}>
                {rule.isActive ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            render: (rule: Rule) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    edit(rule);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(rule.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase text-[#6b7280]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[#1f2937]">{value}</p>
        </div>
        <Route className="h-5 w-5 text-[#2490ef]" />
      </CardContent>
    </Card>
  );
}

function SourceSelect({
  value,
  onChange,
  includeAny = false,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAny?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeAny && <SelectItem value="ANY">Any source</SelectItem>}
        {sources.map((source) => (
          <SelectItem key={source} value={source}>
            {source.replaceAll('_', ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleActive({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-full items-center justify-between rounded-md border px-3 text-sm ${
        checked
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-[#d9d4cc] bg-white text-[#6b7280]'
      }`}
    >
      <span>{checked ? 'Active' : 'Inactive'}</span>
      <span className={`h-3 w-3 rounded-full ${checked ? 'bg-green-500' : 'bg-[#c8c1b8]'}`} />
    </button>
  );
}
