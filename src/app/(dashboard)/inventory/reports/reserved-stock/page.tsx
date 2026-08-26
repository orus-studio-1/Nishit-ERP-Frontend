'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { Product, SalesOrder, Warehouse } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showApiError, showApiSuccess } from '@/lib/apiError';

export default function ReservedStockPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    salesOrderId: '',
    salesOrderItemId: '',
    productId: '',
    warehouseId: '',
    reservedQty: 1,
  });

  const selectedOrder = orders.find((order) => order.id === form.salesOrderId);
  const selectedItem = selectedOrder?.items?.find((item) => item.id === form.salesOrderItemId);
  const orderItems = selectedOrder?.items || [];

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          reserved: acc.reserved + Number(row.reservedQty || 0),
          fulfilled: acc.fulfilled + Number(row.fulfilledQty || 0),
          open: acc.open + Number(row.openQty || 0),
        }),
        { reserved: 0, fulfilled: 0, open: 0 }
      ),
    [rows]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [reportRes, productRes, warehouseRes, orderRes] = await Promise.all([
        api.get('/inventory/reports/reserved-stock'),
        api.get('/inventory/products', { params: { limit: 500, type: 'PRODUCT' } }),
        api.get('/inventory/warehouses'),
        api.get('/sales/orders', { params: { limit: 200 } }),
      ]);
      setRows(reportRes.data?.data || []);
      setProducts(productRes.data?.data?.items || []);
      setWarehouses(warehouseRes.data?.data || []);
      setOrders(orderRes.data?.data?.items || []);
    } catch (err: any) {
      showApiError(err, 'Failed to load reserved stock report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectOrder = async (salesOrderId: string) => {
    setForm((prev) => ({ ...prev, salesOrderId, salesOrderItemId: '', productId: '' }));
    const current = orders.find((order) => order.id === salesOrderId);
    if (current?.items?.length) return;
    try {
      const response = await api.get(`/sales/orders/${salesOrderId}`);
      const detailed = response.data?.data as SalesOrder;
      setOrders((items) => items.map((order) => (order.id === detailed.id ? detailed : order)));
    } catch (err: any) {
      showApiError(err, 'Could not load sales order items');
    }
  };

  const createManualReservation = async () => {
    if (isSubmitting) return;

    if (!form.salesOrderId) {
      toast.error('Please select a sales order');
      return;
    }
    if (!form.salesOrderItemId) {
      toast.error('Please select a sales order item');
      return;
    }
    if (!form.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!form.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    if (!form.reservedQty || Number(form.reservedQty) <= 0) {
      toast.error('Please enter a valid reserved quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/reports/reserved-stock/manual', form);
      showApiSuccess('Reservation created successfully');
      setOpen(false);
      setForm({ salesOrderId: '', salesOrderItemId: '', productId: '', warehouseId: '', reservedQty: 1 });
      load();
    } catch (err: any) {
      showApiError(err, 'Could not create reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reserved Stock"
        description="Stock promised to sales orders but not delivered yet"
        action={{ label: 'Manual Reservation', onClick: () => setOpen(true), icon: Plus }}
      />
      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <Logic label="Logic" value="Active or partial StockReservation rows linked to Sales Orders" />
          <Logic label="Reserved" value={totals.reserved.toLocaleString()} />
          <Logic label="Fulfilled" value={totals.fulfilled.toLocaleString()} />
          <Logic label="Open" value={totals.open.toLocaleString()} />
        </CardContent>
      </Card>
      <DataTable
        data={rows}
        isLoading={isLoading}
        columns={[
          {
            key: 'item',
            header: 'Item',
            render: (row: any) => (
              <span className="font-medium text-gray-900">
                {`${row.product?.sku || ''} ${row.product?.name || ''}`.trim()}
              </span>
            ),
          },
          { key: 'warehouse', header: 'Warehouse', render: (row: any) => row.warehouse?.name || '-' },
          {
            key: 'salesOrder',
            header: 'Sales Order',
            render: (row: any) => (
              <span className="font-mono text-xs text-[#1674c4] font-semibold">{row.salesOrder?.orderNo || '-'}</span>
            ),
          },
          { key: 'customer', header: 'Customer', render: (row: any) => row.salesOrder?.customer?.name || '-' },
          { key: 'reservedQty', header: 'Reserved', render: (row: any) => Number(row.reservedQty || 0).toLocaleString() },
          { key: 'fulfilledQty', header: 'Fulfilled', render: (row: any) => Number(row.fulfilledQty || 0).toLocaleString() },
          { key: 'openQty', header: 'Open', render: (row: any) => Number(row.openQty || 0).toLocaleString() },
          { key: 'status', header: 'Status' },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Stock Reservation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              This creates a real stock reservation. It must be tied to a sales order item, product, and warehouse,
              so available stock calculations stay connected.
            </div>
            <Field label="Sales Order *">
              <Select value={form.salesOrderId} onValueChange={selectOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sales order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 ? (
                    <SelectEmptyState
                      message="No sales orders found"
                      linkHref="/sales/orders"
                      linkText="Create Sales Order"
                    />
                  ) : (
                    orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNo} - {order.customer?.name || 'Customer'} - {order.status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sales Order Item *">
              <Select
                disabled={!form.salesOrderId || orderItems.length === 0}
                value={form.salesOrderItemId}
                onValueChange={(salesOrderItemId) => {
                  const item = orderItems.find((row) => row.id === salesOrderItemId);
                  setForm((prev) => ({ ...prev, salesOrderItemId, productId: item?.productId || '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !form.salesOrderId
                        ? 'Select a sales order first'
                        : orderItems.length
                        ? 'Select order item'
                        : 'No reservable items'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {orderItems.map((item) => (
                    <SelectItem key={item.id} value={item.id || ''}>
                      {item.product?.sku || item.productId} - {item.product?.name || item.description} - Qty{' '}
                      {item.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Product *">
                <Select
                  value={form.productId}
                  onValueChange={(productId) => setForm((prev) => ({ ...prev, productId }))}
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
              </Field>
              <Field label="Warehouse *">
                <Select
                  value={form.warehouseId}
                  onValueChange={(warehouseId) => setForm((prev) => ({ ...prev, warehouseId }))}
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
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={`Reserved Qty *${selectedItem ? `, max open around ${selectedItem.quantity}` : ''}`}>
              <Input
                type="number"
                min="0.000001"
                step="0.000001"
                value={form.reservedQty}
                onChange={(event) => setForm((prev) => ({ ...prev, reservedQty: Number(event.target.value) }))}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createManualReservation}
                disabled={isSubmitting || orders.length === 0 || products.length === 0 || warehouses.length === 0}
              >
                {isSubmitting ? 'Creating...' : 'Create Reservation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Logic({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1f2937]">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#4b5563]">{label}</Label>
      {children}
    </div>
  );
}
