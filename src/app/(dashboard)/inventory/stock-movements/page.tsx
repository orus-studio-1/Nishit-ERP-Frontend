'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUpDown, ArrowUpRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { StockMovement, Product, Warehouse } from '@/types';
import { formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const movTypes = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN'];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    warehouseId: '',
    type: 'IN',
    quantity: '',
    notes: '',
    reference: '',
  });
  const limit = 20;

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [movRes, prodRes, whRes] = await Promise.all([
        api.get('/inventory/stock-movements', { params: { page, limit, type: typeFilter || undefined } }),
        api.get('/inventory/products', { params: { limit: 200 } }),
        api.get('/inventory/warehouses'),
      ]);
      setMovements(movRes.data?.data?.items || []);
      setTotal(movRes.data?.data?.total || 0);
      setProducts(prodRes.data?.data?.items || []);
      setWarehouses(whRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load stock movements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!form.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error('Please enter a valid quantity greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/stock-movements', { ...form, quantity: Number(form.quantity) });
      showApiSuccess('Stock movement recorded successfully');
      setShowModal(false);
      setForm({ productId: '', warehouseId: '', type: 'IN', quantity: '', notes: '', reference: '' });
      fetchAll();
    } catch (err: any) {
      showApiError(err, 'Failed to record stock movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'date', header: 'Date', render: (m: StockMovement) => formatDate(m.createdAt) },
    { key: 'type', header: 'Type', render: (m: StockMovement) => <StatusBadge status={m.type} /> },
    {
      key: 'product',
      header: 'Product',
      render: (m: StockMovement) => <span className="font-medium text-gray-900">{m.product?.name || '—'}</span>,
    },
    { key: 'warehouse', header: 'Warehouse', render: (m: StockMovement) => m.warehouse?.name || '—' },
    {
      key: 'quantity',
      header: 'Qty',
      render: (m: StockMovement) => (
        <span className={m.type === 'OUT' ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
          {m.type === 'OUT' ? '-' : '+'}
          {m.quantity.toLocaleString()}
        </span>
      ),
    },
    { key: 'reference', header: 'Reference', render: (m: StockMovement) => m.reference || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Track inventory in and out across warehouses"
        action={{ label: 'Record Movement', onClick: () => setShowModal(true), icon: Plus }}
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={typeFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('')}
        >
          All
        </Button>
        {movTypes.map((t) => (
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
      {movements.length === 0 && !isLoading ? (
        <EmptyState
          icon={ArrowUpDown}
          title="No movements"
          description="Record your first stock movement"
          action={{ label: 'Record Movement', onClick: () => setShowModal(true) }}
        />
      ) : (
        <>
          <DataTable columns={columns} data={movements} isLoading={isLoading} />
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
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>

          {products.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No products found. Create a product before logging movements.</span>
              </div>
              <Link
                href="/inventory/products"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Product <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {warehouses.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No warehouses found. Create a warehouse location first.</span>
              </div>
              <Link
                href="/inventory/warehouses"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Warehouse <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectEmptyState
                      message="No products found"
                      linkHref="/inventory/products"
                      linkText="Create Product"
                    />
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse *</Label>
              <Select
                value={form.warehouseId}
                onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 ? (
                    <SelectEmptyState
                      message="No warehouses found"
                      linkHref="/inventory/warehouses"
                      linkText="Create Warehouse"
                    />
                  ) : (
                    warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {movTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="PO-001, INV-001, TR-001..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Movement rationale or inspection note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || products.length === 0 || warehouses.length === 0}
              >
                {isSubmitting ? 'Recording...' : 'Record Movement'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
