'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { Lead, LeadStatus, LeadSource } from '@/types';
import { formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';
import { LeadImportDialog } from '@/components/crm/LeadImportDialog';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    country: '',
    source: 'WEBSITE',
    status: 'NEW',
    priority: 'MEDIUM',
    value: '',
    notes: '',
  });
  const router = useRouter();
  const limit = 20;

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/crm/leads', {
        params: { page, limit, search: search || undefined, status: statusFilter || undefined },
      });
      setLeads(res.data?.data?.items || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err: any) {
      showApiError(err, 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = form.title.trim();
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();

    if (!trimmedTitle) {
      toast.error('Please enter a lead title (e.g. Enterprise Software Deal)');
      return;
    }
    if (!trimmedFirst) {
      toast.error('Please enter the contact first name');
      return;
    }
    if (!trimmedLast) {
      toast.error('Please enter the contact last name');
      return;
    }

    const numValue = form.value ? Number(form.value) : undefined;
    if (numValue !== undefined && (Number.isNaN(numValue) || numValue < 0)) {
      toast.error('Estimated value cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const duplicateCheck = await api.post('/crm/leads/check-duplicate', { email: form.email, phone: form.phone, country: form.country });
      const suggestions = duplicateCheck.data?.data?.suggestions || [];
      const allowDuplicate = suggestions.length > 0
        ? window.confirm(`Possible duplicate found: ${suggestions.map((item: any) => item.title).join(', ')}. Create this lead anyway?`)
        : false;
      if (suggestions.length > 0 && !allowDuplicate) return;
      await api.post('/crm/leads', {
        ...form,
        title: trimmedTitle,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        value: numValue,
        allowDuplicate,
      });
      showApiSuccess('Lead created successfully');
      setShowModal(false);
      setForm({
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        city: '',
        country: '',
        source: 'WEBSITE',
        status: 'NEW',
        priority: 'MEDIUM',
        value: '',
        notes: '',
      });
      fetchLeads();
    } catch (err: any) {
      showApiError(err, 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvert = async (id: string) => {
    if (convertingId) return;
    setConvertingId(id);
    try {
      await api.post(`/crm/leads/${id}/convert`, {});
      showApiSuccess('Lead converted to customer and opportunity');
      fetchLeads();
    } catch (err: any) {
      showApiError(err, 'Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
  };

  const handleContact = async (id: string) => {
    if (openingContactId) return;
    setOpeningContactId(id);
    try {
      const res = await api.post(`/crm/leads/${id}/contact`);
      router.push(`/crm/contacts/${res.data?.data?.id}`);
    } catch (err: any) {
      showApiError(err, 'Could not open lead contact');
      setOpeningContactId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Lead',
      render: (l: Lead) => (
        <div>
          <p className="font-medium text-gray-900">
            {l.firstName} {l.lastName}
          </p>
          <p className="text-xs text-gray-400">{l.company || l.email || 'No company'}</p>
        </div>
      ),
    },
    { key: 'source', header: 'Source', render: (l: Lead) => <span className="text-xs text-gray-500">{l.source}</span> },
    { key: 'status', header: 'Status', render: (l: Lead) => <StatusBadge status={l.status} /> },
    { key: 'priority', header: 'Priority', render: (l: Lead) => <StatusBadge status={l.priority} /> },
    { key: 'score', header: 'Score', render: (l: Lead) => l.score || 0 },
    { key: 'value', header: 'Value', render: (l: Lead) => (l.value ? `$${l.value.toLocaleString()}` : '—') },
    {
      key: 'owner',
      header: 'Owner',
      render: (l: Lead) => (l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : '—'),
    },
    { key: 'createdAt', header: 'Created', render: (l: Lead) => formatDate(l.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (l: Lead) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={openingContactId === l.id}
            onClick={(e) => {
              e.stopPropagation();
              handleContact(l.id);
            }}
          >
            {openingContactId === l.id ? 'Opening...' : 'Contact'}
          </Button>
          {l.status !== 'CONVERTED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={convertingId === l.id}
              onClick={(e) => {
                e.stopPropagation();
                handleConvert(l.id);
              }}
            >
              {convertingId === l.id ? 'Converting...' : 'Convert'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Capture, import, qualify, and convert sales leads"
        action={{ label: 'New Lead', onClick: () => setShowModal(true), icon: Plus }}
      >
        <Button variant="outline" onClick={() => setShowImport(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </PageHeader>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {leads.length === 0 && !isLoading ? (
        <EmptyState
          icon={TrendingUp}
          title="No leads yet"
          description="Start capturing leads to grow your business"
          action={{ label: 'Add Lead', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={leads}
            isLoading={isLoading}
            onRowClick={(lead) => router.push(`/crm/leads/${lead.id}`)}
          />
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
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="e.g. Enterprise Software Deal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Value</Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'ADVERTISEMENT', 'OTHER'].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <LeadImportDialog open={showImport} onOpenChange={setShowImport} onImported={fetchLeads} />
    </div>
  );
}
