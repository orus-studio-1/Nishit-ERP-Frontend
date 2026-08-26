'use client';

import { useEffect, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { Category } from '@/types';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', parentId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/inventory/categories');
      setCategories(res.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim().toUpperCase();

    if (!trimmedName) {
      toast.error('Please enter category name');
      return;
    }
    if (!trimmedCode) {
      toast.error('Please enter category code');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/categories', {
        name: trimmedName,
        code: trimmedCode,
        parentId: form.parentId || undefined,
      });
      showApiSuccess(`Category "${trimmedName}" created successfully`);
      setShowModal(false);
      setForm({ name: '', code: '', parentId: '' });
      fetchCategories();
    } catch (err: any) {
      showApiError(err, 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rootCategories = categories.filter((c) => !c.parentId);

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (c: Category) => (
        <span className="font-mono text-sm font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
          {c.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Category',
      render: (c: Category) => (
        <span className={`font-medium ${c.parentId ? 'ml-4 text-gray-600' : 'text-gray-900'}`}>
          {c.parentId ? '↳ ' : ''}
          {c.name}
        </span>
      ),
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (c: Category) => {
        const parent = categories.find((p) => p.id === c.parentId);
        return parent ? parent.name : '—';
      },
    },
    { key: 'products', header: 'Products', render: (c: Category) => c._count?.products || 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize product categories"
        action={{ label: 'New Category', onClick: () => setShowModal(true), icon: Plus }}
      />
      {categories.length === 0 && !isLoading ? (
        <EmptyState
          icon={Tag}
          title="No categories"
          description="Create your first product category"
          action={{ label: 'Add Category', onClick: () => setShowModal(true) }}
        />
      ) : (
        <DataTable columns={columns} data={categories} isLoading={isLoading} />
      )}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                placeholder="e.g. Electronics, Raw Materials"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
                placeholder="e.g. ELEC, RAW, PACK"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select
                value={form.parentId || '__none__'}
                onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {rootCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
