'use client';

import { useEffect, useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { CurrencySelect } from '@/components/ui/currency-select';
import api from '@/lib/api';
import { Supplier } from '@/types';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    currency: 'INR',
    paymentTerms: 30,
    bankAccount: '',
    bankName: '',
    notes: '',
  });
  const limit = 20;

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/suppliers', { params: { page, limit, search: search || undefined } });
      setSuppliers(res.data?.data?.items || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err: any) {
      showApiError(err, 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error('Please enter supplier name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/suppliers', {
        ...form,
        name: trimmedName,
        paymentTerms: Number(form.paymentTerms || 0),
      });
      showApiSuccess(`Supplier "${trimmedName}" created successfully`);
      setShowModal(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        taxId: '',
        currency: 'INR',
        paymentTerms: 30,
        bankAccount: '',
        bankName: '',
        notes: '',
      });
      fetchSuppliers();
    } catch (err: any) {
      showApiError(err, 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'supplierNo', header: 'ID' },
    {
      key: 'name',
      header: 'Name',
      render: (s: Supplier) => <span className="font-medium text-gray-900">{s.name}</span>,
    },
    { key: 'email', header: 'Email', render: (s: Supplier) => s.email || '—' },
    { key: 'phone', header: 'Phone', render: (s: Supplier) => s.phone || '—' },
    { key: 'country', header: 'Country', render: (s: Supplier) => s.country || '—' },
    { key: 'currency', header: 'Currency' },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (s: Supplier) => `${s.paymentTerms} days`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier accounts"
        action={{ label: 'New Supplier', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="mb-4">
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>
      {suppliers.length === 0 && !isLoading ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Add your first supplier"
          action={{ label: 'Add Supplier', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={suppliers} isLoading={isLoading} />
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
            <DialogTitle>New Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                placeholder="e.g. Bharat Petroleum Ltd"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="billing@supplier.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                placeholder="Industrial Area, Phase 2"
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                placeholder="Mumbai"
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.country}
                placeholder="India"
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Account</Label>
              <Input
                value={form.bankAccount}
                placeholder="Account number"
                onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input
                value={form.bankName}
                placeholder="e.g. HDFC Bank"
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect
                value={form.currency}
                onChange={(currency) => setForm((f) => ({ ...f, currency }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
