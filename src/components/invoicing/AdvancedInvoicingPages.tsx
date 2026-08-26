'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileClock, PackageCheck, Play, Plus, Trash2, Truck } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { SelectEmptyState } from '@/components/shared/SelectEmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { DeskPage, Field } from './AdvancedInvoicingShell';
import toast from 'react-hot-toast';

function items(payload: any) {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function total(payload: any) {
  return payload?.data?.total || payload?.data?.pagination?.total || items(payload).length;
}

export function PaymentEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    paidAmount: '',
    method: 'BANK_TRANSFER',
    reference: '',
    invoiceId: '',
    allocatedAmount: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const [entryRes, invoiceRes, customerRes] = await Promise.all([
        api.get('/payments/entries'),
        api.get('/invoices', { params: { limit: 200 } }),
        api.get('/customers', { params: { limit: 200 } }),
      ]);
      setEntries(items(entryRes.data));
      const openInvoices = items(invoiceRes.data).filter(
        (invoice: any) =>
          invoice.status !== 'DRAFT' &&
          invoice.status !== 'CANCELLED' &&
          Number(invoice.outstandingAmount || invoice.total - invoice.amountPaid) > 0
      );
      setInvoices(openInvoices);
      setCustomers(items(customerRes.data));
    } catch (err: any) {
      showApiError(err, 'Failed to load payment entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === form.invoiceId),
    [invoices, form.invoiceId]
  );

  const create = async () => {
    if (isSubmitting) return;

    const paidNum = Number(form.paidAmount);
    if (!form.paidAmount || Number.isNaN(paidNum) || paidNum <= 0) {
      toast.error('Please enter a paid amount greater than zero');
      return;
    }

    const customerId = form.customerId || selectedInvoice?.customerId;
    if (!customerId) {
      toast.error('Please select a customer or an invoice');
      return;
    }

    setIsSubmitting(true);
    try {
      const allocatedAmount = Number(form.allocatedAmount || form.paidAmount || 0);
      await api.post('/payments/entries', {
        type: 'RECEIVED',
        customerId,
        paidAmount: paidNum,
        method: form.method,
        reference: form.reference,
        currency: selectedInvoice?.currency || 'INR',
        allocations: form.invoiceId ? [{ invoiceId: form.invoiceId, allocatedAmount }] : [],
      });
      showApiSuccess('Payment entry drafted');
      setOpen(false);
      setForm({ customerId: '', paidAmount: '', method: 'BANK_TRANSFER', reference: '', invoiceId: '', allocatedAmount: '' });
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create payment entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/payments/entries/${id}/status`, { status });
      showApiSuccess(`Payment entry ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to update payment entry');
    }
  };

  return (
    <DeskPage
      title="Payment Entries"
      description="Allocate one receipt across invoices or keep the balance as customer advance."
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      }
    >
      {entries.length || isLoading ? (
        <DataTable
          data={entries}
          isLoading={isLoading}
          columns={[
            { key: 'paymentNo', header: 'Entry #' },
            { key: 'customer', header: 'Customer', render: (e: any) => e.customer?.name || '-' },
            { key: 'status', header: 'Status', render: (e: any) => <StatusBadge status={e.status} /> },
            { key: 'paidAmount', header: 'Paid', render: (e: any) => formatCurrency(e.paidAmount, e.currency) },
            { key: 'allocatedAmount', header: 'Allocated', render: (e: any) => formatCurrency(e.allocatedAmount, e.currency) },
            { key: 'unallocatedAmount', header: 'Advance', render: (e: any) => formatCurrency(e.unallocatedAmount, e.currency) },
            {
              key: 'actions',
              header: '',
              render: (e: any) => (
                <div className="flex justify-end gap-2">
                  {e.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => setStatus(e.id, 'SUBMITTED')}>
                      Submit
                    </Button>
                  )}
                  {e.status === 'SUBMITTED' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(e.id, 'CANCELLED')}>
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No payment entries"
          description="Create a payment entry to allocate receipts across invoices."
          action={{ label: 'New Entry', onClick: () => setOpen(true) }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Payment Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer">
                <Select
                  value={form.customerId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectEmptyState
                        message="No customers found"
                        linkHref="/customers"
                        linkText="Create Customer"
                      />
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Method">
                <Select
                  value={form.method}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'ONLINE'].map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Paid Amount *">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.paidAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
                />
              </Field>
              <Field label="Reference">
                <Input
                  value={form.reference}
                  placeholder="e.g. Bank Ref / Cheque No."
                  onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                />
              </Field>
            </div>
            <div className="rounded-md border border-[#dfe3e8] p-3">
              <div className="mb-3 text-sm font-medium text-[#1f2937]">Invoice Allocation</div>
              <div className="grid grid-cols-[1fr_180px] gap-3">
                <Select
                  value={form.invoiceId}
                  onValueChange={(value) => {
                    const invoice = invoices.find((i) => i.id === value);
                    setForm((prev) => ({
                      ...prev,
                      invoiceId: value,
                      customerId: invoice?.customerId || prev.customerId,
                      allocatedAmount: String(invoice?.outstandingAmount || ''),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional invoice allocation" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.length === 0 ? (
                      <SelectEmptyState
                        message="No open invoices found"
                        linkHref="/invoicing/sales-invoices/new"
                        linkText="Create Invoice"
                      />
                    ) : (
                      invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNo} - {invoice.customer?.name} -{' '}
                          {formatCurrency(invoice.outstandingAmount, invoice.currency)} due
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={form.allocatedAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, allocatedAmount: event.target.value }))}
                  placeholder="Allocated amount"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Draft'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DeskPage>
  );
}

export function DeliveryNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    salesOrderId: '',
    warehouseId: '',
    date: new Date().toISOString().slice(0, 10),
    postingDate: '',
    notes: '',
  });
  const [deliveryRows, setDeliveryRows] = useState<any[]>([{ productId: '', description: '', quantity: 1 }]);
  const [totalRows, setTotalRows] = useState(0);

  const load = async () => {
    setIsLoading(true);
    try {
      const [noteRes, customerRes, orderRes, warehouseRes, productRes] = await Promise.all([
        api.get('/delivery-notes'),
        api.get('/customers', { params: { limit: 200, isActive: true } }),
        api.get('/sales/orders', { params: { limit: 200 } }),
        api.get('/inventory/warehouses'),
        api.get('/inventory/products', { params: { limit: 200, isActive: true } }),
      ]);
      setNotes(items(noteRes.data));
      setTotalRows(total(noteRes.data));
      setCustomers(items(customerRes.data));
      setOrders(items(orderRes.data).filter((order: any) => !['DRAFT', 'CANCELLED', 'CLOSED'].includes(order.status)));
      setWarehouses(items(warehouseRes.data));
      setProducts(items(productRes.data).filter((product: any) => product.type !== 'SERVICE'));
    } catch (err: any) {
      showApiError(err, 'Failed to load delivery notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/delivery-notes/${id}/status`, { status });
      showApiSuccess(`Delivery note ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to update delivery note');
    }
  };

  const createInvoice = async (id: string) => {
    try {
      const res = await api.post(`/invoices/from-delivery-note/${id}`);
      const invoice = res.data?.data;
      showApiSuccess('Draft invoice created from delivery note');
      if (invoice?.id) window.location.href = `/invoicing/sales-invoices/${invoice.id}`;
    } catch (err: any) {
      showApiError(err, 'Failed to create invoice');
    }
  };

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === form.salesOrderId),
    [orders, form.salesOrderId]
  );

  const createFromOrder = async () => {
    if (!form.salesOrderId) return toast.error('Select a sales order');
    try {
      await api.post(`/delivery-notes/from-sales-order/${form.salesOrderId}`);
      showApiSuccess('Draft delivery note created from sales order');
      setOpen(false);
      resetDeliveryForm();
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create delivery note');
    }
  };

  const createManual = async () => {
    if (!form.customerId) return toast.error('Select a customer');
    const rows = deliveryRows.filter((row) => row.productId && Number(row.quantity) > 0);
    if (!rows.length) return toast.error('Add at least one product to deliver');
    try {
      await api.post('/delivery-notes', {
        ...form,
        salesOrderId: form.salesOrderId || undefined,
        warehouseId: form.warehouseId || undefined,
        postingDate: form.postingDate || undefined,
        items: rows,
      });
      showApiSuccess('Draft delivery note created');
      setOpen(false);
      resetDeliveryForm();
      load();
    } catch (err: any) {
      showApiError(err, 'Failed to create delivery note');
    }
  };

  const resetDeliveryForm = () => {
    setForm({
      customerId: '',
      salesOrderId: '',
      warehouseId: '',
      date: new Date().toISOString().slice(0, 10),
      postingDate: '',
      notes: '',
    });
    setDeliveryRows([{ productId: '', description: '', quantity: 1 }]);
  };

  return (
    <DeskPage
      title="Delivery Notes"
      description="Draft the shipment, submit when goods leave stock, then invoice from the delivered document."
      meta={`${totalRows} records`}
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Delivery Note
        </Button>
      }
    >
      {notes.length || isLoading ? (
        <DataTable
          data={notes}
          isLoading={isLoading}
          columns={[
            { key: 'deliveryNo', header: 'Delivery #' },
            { key: 'customer', header: 'Customer', render: (n: any) => n.customer?.name || '-' },
            { key: 'salesOrder', header: 'Sales Order', render: (n: any) => n.salesOrder?.orderNo || '-' },
            { key: 'warehouse', header: 'Warehouse', render: (n: any) => n.warehouse?.name || 'Main Warehouse' },
            { key: 'date', header: 'Date', render: (n: any) => formatDate(n.date) },
            { key: 'status', header: 'Status', render: (n: any) => <StatusBadge status={n.status} /> },
            { key: 'items', header: 'Items', render: (n: any) => n.items?.length || 0 },
            {
              key: 'actions',
              header: '',
              render: (n: any) => (
                <div className="flex justify-end gap-2">
                  {n.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => setStatus(n.id, 'SUBMITTED')}>
                      Submit
                    </Button>
                  )}
                  {n.status === 'SUBMITTED' && (
                    <Button size="sm" onClick={() => createInvoice(n.id)}>
                      Invoice
                    </Button>
                  )}
                  {n.status === 'SUBMITTED' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(n.id, 'CANCELLED')}>
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={PackageCheck}
          title="No delivery notes"
          description="Create delivery notes from confirmed sales orders or enter a manual shipment."
          action={{ label: 'New Delivery Note', onClick: () => setOpen(true) }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>New Delivery Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border border-[#e5e2dc] bg-[#f8faf9] p-3 text-sm text-[#4b5563]">
              Delivery Notes are stock documents. Create from a Sales Order when possible; use manual rows for direct shipment adjustments.
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Get from Sales Order">
                <Select
                  value={form.salesOrderId}
                  onValueChange={(value) => {
                    const order = orders.find((o) => o.id === value);
                    setForm((prev) => ({
                      ...prev,
                      salesOrderId: value,
                      customerId: order?.customerId || prev.customerId,
                    }));
                    if (order?.items?.length) {
                      setDeliveryRows(
                        order.items.map((item: any) => ({
                          productId: item.productId,
                          description: item.description || item.product?.name || '',
                          quantity: Number(item.quantity || 1),
                        }))
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional source order" />
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
                          {order.orderNo} · {order.customer?.name || 'Customer'} · {order.status}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Customer">
                <Select
                  value={form.customerId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectEmptyState
                        message="No customers found"
                        linkHref="/customers"
                        linkText="Create Customer"
                      />
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Warehouse">
                <Select
                  value={form.warehouseId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, warehouseId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Default active warehouse" />
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
                          {warehouse.code ? `${warehouse.code} - ` : ''}
                          {warehouse.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </Field>
              <Field label="Posting Date">
                <Input
                  type="date"
                  value={form.postingDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, postingDate: event.target.value }))}
                />
              </Field>
              <Field label="Notes">
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Transporter, LR number, delivery remarks"
                />
              </Field>
            </div>

            {selectedOrder && (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Source {selectedOrder.orderNo}: {selectedOrder.items?.length || 0} item(s) will be copied into the draft delivery note.
              </div>
            )}

            <DeliveryRows rows={deliveryRows} products={products} onChange={setDeliveryRows} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {form.salesOrderId && (
                <Button variant="outline" onClick={createFromOrder}>
                  <Truck className="mr-2 h-4 w-4" />
                  Create from Sales Order
                </Button>
              )}
              <Button onClick={createManual}>Create Manual Draft</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DeskPage>
  );
}

function DeliveryRows({ rows, products, onChange }: { rows: any[]; products: any[]; onChange: (rows: any[]) => void }) {
  const update = (index: number, patch: any) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const add = () => onChange([...rows, { productId: '', description: '', quantity: 1 }]);
  const remove = (index: number) => onChange(rows.length === 1 ? rows : rows.filter((_, i) => i !== index));

  return (
    <div className="rounded-md border border-[#e5e2dc] bg-white">
      <div className="grid grid-cols-[2fr_2fr_120px_48px] border-b border-[#e5e2dc] bg-[#f8faf9] px-3 py-2 text-xs font-semibold uppercase text-[#6b7280]">
        <span>Product</span>
        <span>Description</span>
        <span>Qty</span>
        <span />
      </div>
      <div className="divide-y divide-[#f0ede8]">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[2fr_2fr_120px_48px] gap-2 px-3 py-2">
            <Select
              value={row.productId}
              onValueChange={(value) => {
                const product = products.find((p) => p.id === value);
                update(index, {
                  productId: value,
                  description: row.description || product?.name || '',
                  itemCode: product?.sku || '',
                });
              }}
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
                      {product.sku} · {product.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Input
              value={row.description || ''}
              onChange={(event) => update(index, { description: event.target.value })}
            />
            <Input
              type="number"
              min="0.000001"
              step="0.000001"
              value={row.quantity}
              onChange={(event) => update(index, { quantity: Number(event.target.value) })}
            />
            <Button variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="border-t border-[#e5e2dc] p-2">
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
      </div>
    </div>
  );
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = useState({ entityType: 'ALL', action: 'ALL', search: '', fromDate: '', toDate: '' });

  const load = () => {
    api
      .get('/invoicing/audit-logs', {
        params: {
          limit: 100,
          entityType: filters.entityType === 'ALL' ? undefined : filters.entityType,
          action: filters.action === 'ALL' ? undefined : filters.action,
          search: filters.search || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        },
      })
      .then((res) => {
        setLogs(items(res.data));
        setTotalRows(total(res.data));
      })
      .catch((err) => showApiError(err, 'Failed to load audit log'));
  };

  useEffect(() => {
    load();
  }, [filters.entityType, filters.action]);

  return (
    <DeskPage
      title="Audit Log"
      description="Immutable document timeline for invoice lifecycle, delivery, credit note, and payment actions."
      meta={`${totalRows} events`}
      action={
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      }
    >
      <div className="grid gap-3 border-b border-[#edf0f2] bg-[#f8faf9] p-3 md:grid-cols-5">
        <Input
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') load();
          }}
          placeholder="Search message or actor"
        />
        <Select
          value={filters.entityType}
          onValueChange={(entityType) => setFilters((prev) => ({ ...prev, entityType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['ALL', 'SALES_INVOICE', 'DELIVERY_NOTE', 'CREDIT_NOTE', 'PAYMENT_ENTRY'].map((type) => (
              <SelectItem key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.action} onValueChange={(action) => setFilters((prev) => ({ ...prev, action }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              'ALL',
              'CREATE',
              'UPDATE',
              'SUBMIT',
              'CANCEL',
              'AMEND',
              'DELETE',
              'CREATE_FROM_SALES_ORDER',
              'CREATE_FROM_DELIVERY_NOTE',
            ].map((action) => (
              <SelectItem key={action} value={action}>
                {action.replaceAll('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.fromDate}
          onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
        />
        <Input
          type="date"
          value={filters.toDate}
          onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
        />
      </div>
      {logs.length ? (
        <DataTable
          data={logs}
          columns={[
            { key: 'createdAt', header: 'Time', render: (l: any) => formatDate(l.createdAt) },
            { key: 'entityType', header: 'Document' },
            {
              key: 'voucher',
              header: 'Voucher',
              render: (l: any) =>
                l.invoice?.invoiceNo || l.deliveryNote?.deliveryNo || l.creditNote?.creditNoteNo || l.entityId,
            },
            { key: 'action', header: 'Action', render: (l: any) => <StatusBadge status={l.action} /> },
            { key: 'statusBefore', header: 'Before', render: (l: any) => l.statusBefore || '-' },
            { key: 'statusAfter', header: 'After', render: (l: any) => l.statusAfter || '-' },
            { key: 'actorEmail', header: 'User', render: (l: any) => l.actorEmail || l.actorRole || '-' },
            { key: 'message', header: 'Message', render: (l: any) => l.message || '-' },
          ]}
        />
      ) : (
        <EmptyState
          icon={FileClock}
          title="No audit events"
          description="Document actions will appear here as users work."
        />
      )}
    </DeskPage>
  );
}

export function RecurringRunnerButton({ onDone }: { onDone?: () => void }) {
  const run = async () => {
    try {
      const res = await api.post('/invoicing/subscriptions/run-due');
      showApiSuccess(res.data?.message || 'Recurring invoices generated');
      onDone?.();
    } catch (err: any) {
      showApiError(err, 'Failed to run recurring invoices');
    }
  };
  return (
    <Button variant="outline" onClick={run}>
      <Play className="mr-2 h-4 w-4" />
      Run Due Now
    </Button>
  );
}
