'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import api from '@/lib/api';
import { Contact, Lead } from '@/types';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const emptyForm = {
    leadId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    position: '',
    city: '',
    country: '',
  };
  const [form, setForm] = useState(emptyForm);
  const router = useRouter();
  const limit = 20;

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/crm/contacts', { params: { page, limit, search: search || undefined } });
      setContacts(res.data?.data?.items || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err: any) {
      showApiError(err, 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, search]);

  useEffect(() => {
    api
      .get('/crm/leads', { params: { limit: 100 } })
      .then((res) => setLeads(res.data?.data?.items || []))
      .catch((err) => showApiError(err, 'Failed to load leads list'));
  }, []);

  const selectLead = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    setForm((prev) => ({
      ...prev,
      leadId,
      firstName: lead?.firstName || prev.firstName,
      lastName: lead?.lastName || prev.lastName,
      email: lead?.email || prev.email,
      phone: lead?.phone || prev.phone,
      company: lead?.company || lead?.organization?.name || prev.company,
      city: lead?.city || prev.city,
      country: lead?.country || prev.country,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();

    if (!trimmedFirst) {
      toast.error('Please enter first name');
      return;
    }
    if (!trimmedLast) {
      toast.error('Please enter last name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/crm/contacts', {
        ...form,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        leadId: form.leadId || undefined,
      });
      showApiSuccess(`Contact "${trimmedFirst} ${trimmedLast}" created successfully`);
      setShowModal(false);
      setForm(emptyForm);
      fetchContacts();
    } catch (err: any) {
      showApiError(err, 'Failed to create contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (c: Contact) => (
        <span className="font-medium text-gray-900">
          {c.firstName} {c.lastName}
        </span>
      ),
    },
    { key: 'company', header: 'Company', render: (c: Contact) => c.company || '—' },
    { key: 'lead', header: 'Source Lead', render: (c: Contact) => (c.lead ? c.lead.title : '—') },
    { key: 'position', header: 'Position', render: (c: Contact) => c.position || '—' },
    { key: 'email', header: 'Email', render: (c: Contact) => c.email || '—' },
    { key: 'phone', header: 'Phone', render: (c: Contact) => c.phone || c.mobile || '—' },
    {
      key: 'city',
      header: 'City',
      render: (c: Contact) => [c.city, c.country].filter(Boolean).join(', ') || '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage your CRM contacts"
        action={{ label: 'New Contact', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="mb-4">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>
      {contacts.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Add your first contact directly or select from your leads"
          action={{ label: 'Add Contact', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={contacts}
            isLoading={isLoading}
            onRowClick={(contact) => router.push(`/crm/contacts/${contact.id}`)}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Source Lead</Label>
              <Select
                value={form.leadId || 'none'}
                onValueChange={(value) => (value === 'none' ? setForm(emptyForm) : selectLead(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the lead this contact belongs to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No source lead</SelectItem>
                  {leads.length === 0 ? (
                    <SelectEmptyState
                      message="No leads found"
                      linkHref="/crm/leads"
                      linkText="Create Lead"
                    />
                  ) : (
                    leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.title} · {lead.email || lead.phone || lead.company || 'No contact info'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6b7280]">
                Select a lead to auto-fill the contact and keep the CRM chain connected.
              </p>
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
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
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
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
