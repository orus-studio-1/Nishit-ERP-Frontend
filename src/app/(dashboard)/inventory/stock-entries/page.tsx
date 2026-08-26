'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUpRight, Plus } from 'lucide-react';
import api from '@/lib/api';
import { Product, StockEntry, Warehouse } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import toast from 'react-hot-toast';

const purposes = [
  'MATERIAL_RECEIPT',
  'MATERIAL_ISSUE',
  'MATERIAL_TRANSFER',
  'REPACK',
  'OPENING_STOCK',
  'STOCK_RECONCILIATION',
];

export default function StockEntriesPage() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    purpose: 'MATERIAL_RECEIPT',
    postingDate: new Date().toISOString().slice(0, 10),
    fromWarehouseId: '',
    toWarehouseId: '',
    remarks: '',
  });
  const [rows, setRows] = useState([{ productId: '', warehouseId: '', quantity: 1, valuationRate: 0, batchId: '', batchNo: '', serialNoId: '', serialNo: '' }]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [entryRes, productRes, warehouseRes, batchRes, serialRes] = await Promise.all([
        api.get('/inventory/stock-entries'),
        api.get('/inventory/products', { params: { limit: 300, type: 'PRODUCT' } }),
        api.get('/inventory/warehouses'),
        api.get('/inventory/batches'),
        api.get('/inventory/serial-numbers'),
      ]);
      setEntries(entryRes.data?.data?.items || []);
      setProducts(productRes.data?.data?.items || []);
      setWarehouses(warehouseRes.data?.data || []);
      setBatches(batchRes.data?.data || []);
      setSerials(serialRes.data?.data || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load stock entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (isSubmitting) return;
    const items = rows.filter((row) => row.productId && Number(row.quantity) > 0);
    if (!items.length) {
      toast.error('Add at least one product with quantity > 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/stock-entries', { ...form, items });
      showApiSuccess('Stock entry created successfully');
      setOpen(false);
      setRows([{ productId: '', warehouseId: '', quantity: 1, valuationRate: 0, batchId: '', batchNo: '', serialNoId: '', serialNo: '' }]);
      load();
    } catch (err: any) {
      showApiError(err, 'Could not create stock entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const transition = async (entry: StockEntry, status: string) => {
    try {
      await api.patch(`/inventory/stock-entries/${entry.id}/status`, { status });
      showApiSuccess(`Stock entry marked ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      showApiError(err, 'Status update failed');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Entries"
        description="Submit auditable inventory receipts, issues, transfers, and opening balances"
        action={{ label: 'New Stock Entry', onClick: () => setOpen(true), icon: Plus }}
      />
      <DataTable
        data={entries}
        isLoading={isLoading}
        columns={[
          {
            key: 'entryNo',
            header: 'Entry #',
            render: (entry: StockEntry) => (
              <span className="font-mono font-semibold text-[#1674c4]">{entry.entryNo}</span>
            ),
          },
          {
            key: 'purpose',
            header: 'Purpose',
            render: (entry: StockEntry) => entry.purpose.replaceAll('_', ' '),
          },
          {
            key: 'postingDate',
            header: 'Posting Date',
            render: (entry: StockEntry) => formatDate(entry.postingDate),
          },
          {
            key: 'warehouses',
            header: 'Warehouse',
            render: (entry: StockEntry) =>
              [entry.fromWarehouse?.name, entry.toWarehouse?.name].filter(Boolean).join(' -> ') ||
              entry.items?.[0]?.warehouse?.name ||
              '-',
          },
          { key: 'items', header: 'Items', render: (entry: StockEntry) => entry.items?.length || 0 },
          { key: 'status', header: 'Status', render: (entry: StockEntry) => <StatusBadge status={entry.status} /> },
          {
            key: 'actions',
            header: '',
            render: (entry: StockEntry) => (
              <div className="flex gap-2 justify-end">
                {entry.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      transition(entry, 'SUBMITTED');
                    }}
                  >
                    Submit
                  </Button>
                )}
                {entry.status === 'SUBMITTED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      transition(entry, 'CANCELLED');
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Stock Entry</DialogTitle>
          </DialogHeader>

          {products.length === 0 && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No products found. Create products before logging stock entries.</span>
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
                <span>No warehouses found. Create a warehouse to manage storage locations.</span>
              </div>
              <Link
                href="/inventory/warehouses"
                className="inline-flex items-center gap-0.5 font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Create Warehouse <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <Select value={form.purpose} onValueChange={(purpose) => setForm((prev) => ({ ...prev, purpose }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {purposes.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Posting Date</Label>
                <Input
                  type="date"
                  value={form.postingDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, postingDate: e.target.value }))}
                />
              </div>
              <WarehouseSelect
                label="From Warehouse"
                value={form.fromWarehouseId}
                warehouses={warehouses}
                onChange={(fromWarehouseId) => setForm((prev) => ({ ...prev, fromWarehouseId }))}
              />
              <WarehouseSelect
                label="To Warehouse"
                value={form.toWarehouseId}
                warehouses={warehouses}
                onChange={(toWarehouseId) => setForm((prev) => ({ ...prev, toWarehouseId }))}
              />
            </div>
            <div className="overflow-x-auto rounded-md border border-[#e5e2dc]">
              <table className="w-full text-sm">
                <thead className="bg-[#f8faf9] text-xs uppercase text-[#6b7280]">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Warehouse</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-left">Serial</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-[#ece8e1]">
                      <td className="px-3 py-2">
                        <Select
                          value={row.productId}
                          onValueChange={(productId) =>
                            setRows((prev) =>
                              prev.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      productId,
                                      batchId: '',
                                      batchNo: '',
                                      serialNoId: '',
                                      serialNo: '',
                                      valuationRate: Number(
                                        products.find((p) => p.id === productId)?.costPrice || r.valuationRate
                                      ),
                                    }
                                  : r
                              )
                            )
                          }
                        >
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
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.sku} - {product.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.warehouseId}
                          onValueChange={(warehouseId) =>
                            setRows((prev) => prev.map((r, i) => (i === index ? { ...r, warehouseId } : r)))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional row warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.length === 0 ? (
                              <SelectEmptyState
                                message="No warehouses found"
                                linkHref="/inventory/warehouses"
                                linkText="Create Warehouse"
                              />
                            ) : (
                              warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-right"
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, quantity: Number(e.target.value) } : r))
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-right"
                          type="number"
                          value={row.valuationRate}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, valuationRate: Number(e.target.value) } : r))
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </td>
                      <td className="px-3 py-2"><div className="space-y-1"><select className="h-8 w-36 rounded border px-2" value={row.batchId} onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, batchId: e.target.value, batchNo: '' } : r))}><option value="">Existing batch</option>{batches.filter((batch) => batch.productId === row.productId && (!row.warehouseId || batch.warehouseId === row.warehouseId)).map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNo}</option>)}</select>{!row.batchId && <Input className="h-8 w-36" placeholder="New batch no" value={row.batchNo} onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, batchNo: e.target.value } : r))} />}</div></td>
                      <td className="px-3 py-2"><div className="space-y-1"><select className="h-8 w-36 rounded border px-2" value={row.serialNoId} onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, serialNoId: e.target.value, serialNo: '' } : r))}><option value="">Existing serial</option>{serials.filter((serial) => serial.productId === row.productId && (!row.warehouseId || serial.warehouseId === row.warehouseId)).map((serial) => <option key={serial.id} value={serial.id}>{serial.serialNo}</option>)}</select>{!row.serialNoId && <Input className="h-8 w-36" placeholder="New serial no" value={row.serialNo} onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, serialNo: e.target.value } : r))} />}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setRows((prev) => [...prev, { productId: '', warehouseId: '', quantity: 1, valuationRate: 0, batchId: '', batchNo: '', serialNoId: '', serialNo: '' }])
                }
              >
                Add Row
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={create}
                  disabled={isSubmitting || products.length === 0 || warehouses.length === 0}
                >
                  {isSubmitting ? 'Creating...' : 'Create Draft'}
                </Button>
              </div>
            </div>
            <Textarea
              placeholder="Remarks"
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WarehouseSelect({
  label,
  value,
  warehouses,
  onChange,
}: {
  label: string;
  value: string;
  warehouses: Warehouse[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
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
            warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
