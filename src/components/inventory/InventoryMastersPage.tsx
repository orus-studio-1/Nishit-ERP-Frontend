'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Row = Record<string, any>;
const itemsOf = (response: any) => response?.data?.data?.items || response?.data?.data || [];

function NativeSelect({ value, onChange, label, options, disabled }: { value: string; onChange: (value: string) => void; label: string; options: Array<{ id: string; label: string }>; disabled?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">Select {label.toLowerCase()}</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>;
}

function Records({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  return <div className="mt-4 max-h-72 space-y-2 overflow-y-auto border-t pt-4">{empty ? <p className="text-sm text-muted-foreground">No records created yet.</p> : children}</div>;
}

export function InventoryMastersPage() {
  const [units, setUnits] = useState<Row[]>([]);
  const [attributes, setAttributes] = useState<Row[]>([]);
  const [conversions, setConversions] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Row[]>([]);
  const [serials, setSerials] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [warehouses, setWarehouses] = useState<Row[]>([]);
  const [busy, setBusy] = useState('');
  const [unit, setUnit] = useState({ name: '', symbol: '' });
  const [attribute, setAttribute] = useState({ name: '', values: '' });
  const [conversion, setConversion] = useState({ productId: '', fromUnitId: '', toUnitId: '', factor: '' });
  const [batch, setBatch] = useState({ batchNo: '', productId: '', warehouseId: '', quantity: '0', manufacturingDate: '', expiryDate: '', supplierBatchNo: '' });
  const [serial, setSerial] = useState({ serialNo: '', productId: '', warehouseId: '', batchId: '', purchaseRate: '' });

  const load = useCallback(async () => {
    try {
      const [u, a, c, b, s, p, w] = await Promise.all([
        api.get('/inventory/units'), api.get('/inventory/attributes'), api.get('/inventory/uom-conversions'),
        api.get('/inventory/batches'), api.get('/inventory/serial-numbers'),
        api.get('/inventory/products', { params: { limit: 500 } }), api.get('/inventory/warehouses'),
      ]);
      setUnits(itemsOf(u)); setAttributes(itemsOf(a)); setConversions(itemsOf(c)); setBatches(itemsOf(b)); setSerials(itemsOf(s)); setProducts(itemsOf(p)); setWarehouses(itemsOf(w));
    } catch (error) { showApiError(error, 'Failed to load inventory master data'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (key: string, path: string, body: Row, reset: () => void, message: string) => {
    if (busy) return;
    setBusy(key);
    try { await api.post(path, body); showApiSuccess(message); reset(); await load(); }
    catch (error) { showApiError(error, `Could not create ${key}`); }
    finally { setBusy(''); }
  };
  const remove = async (path: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This is allowed only when it is not used by another record.`)) return;
    try { await api.delete(path); showApiSuccess(`${label} deleted`); await load(); } catch (error) { showApiError(error, `Could not delete ${label}`); }
  };

  const productOptions = products.map(item => ({ id: item.id, label: `${item.sku} · ${item.name}` }));
  const warehouseOptions = warehouses.map(item => ({ id: item.id, label: item.name }));
  const unitOptions = units.map(item => ({ id: item.id, label: `${item.name} (${item.symbol})` }));

  return <div className="space-y-5">
    <PageHeader title="Inventory Configuration" description="Create every master record required by products, stock entries, transfers, pricing and traceability" />
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Units of Measure</CardTitle><CardDescription>Units shown in the Product form. Standard units are created automatically.</CardDescription></CardHeader><CardContent>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input placeholder="Unit name" value={unit.name} onChange={e => setUnit({ ...unit, name: e.target.value })} /><Input placeholder="Symbol" value={unit.symbol} onChange={e => setUnit({ ...unit, symbol: e.target.value })} /><Button disabled={!unit.name.trim() || !unit.symbol.trim() || !!busy} onClick={() => submit('unit', '/inventory/units', unit, () => setUnit({ name: '', symbol: '' }), 'Unit created')}><Plus className="h-4 w-4" /></Button></div>
        <Records empty={!units.length}>{units.map(row => <div key={row.id} className="flex items-center justify-between rounded border p-2 text-sm"><span>{row.name} <span className="text-muted-foreground">({row.symbol})</span></span><Button size="sm" variant="ghost" onClick={() => remove(`/inventory/units/${row.id}`, row.name)}><Trash2 className="h-4 w-4" /></Button></div>)}</Records>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Product Attributes</CardTitle><CardDescription>Create variant dimensions such as size, colour, grade or material.</CardDescription></CardHeader><CardContent className="space-y-2">
        <Input placeholder="Attribute name, e.g. Colour" value={attribute.name} onChange={e => setAttribute({ ...attribute, name: e.target.value })} /><Input placeholder="Values separated by commas, e.g. Red, Blue" value={attribute.values} onChange={e => setAttribute({ ...attribute, values: e.target.value })} /><Button disabled={!attribute.name.trim() || !!busy} onClick={() => submit('attribute', '/inventory/attributes', { name: attribute.name.trim(), values: attribute.values.split(',').map(v => v.trim()).filter(Boolean) }, () => setAttribute({ name: '', values: '' }), 'Product attribute created')}>Add Attribute</Button>
        <Records empty={!attributes.length}>{attributes.map(row => <div key={row.id} className="rounded border p-2 text-sm"><span className="font-medium">{row.name}</span><p className="text-muted-foreground">{row.values?.map((value: Row) => value.value).join(', ') || 'No values'}</p></div>)}</Records>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>UOM Conversions</CardTitle><CardDescription>Define product-specific conversions, for example 1 Box = 20 Pieces.</CardDescription></CardHeader><CardContent className="space-y-2">
        <NativeSelect label="Product" value={conversion.productId} onChange={productId => setConversion({ ...conversion, productId })} options={productOptions} />
        <div className="grid grid-cols-2 gap-2"><NativeSelect label="From unit" value={conversion.fromUnitId} onChange={fromUnitId => setConversion({ ...conversion, fromUnitId })} options={unitOptions} /><NativeSelect label="To unit" value={conversion.toUnitId} onChange={toUnitId => setConversion({ ...conversion, toUnitId })} options={unitOptions} /></div>
        <Input type="number" min="0.000001" step="any" placeholder="Conversion factor" value={conversion.factor} onChange={e => setConversion({ ...conversion, factor: e.target.value })} />
        <Button disabled={!conversion.productId || !conversion.fromUnitId || !conversion.toUnitId || !Number(conversion.factor) || conversion.fromUnitId === conversion.toUnitId || !!busy} onClick={() => submit('conversion', '/inventory/uom-conversions', { ...conversion, factor: Number(conversion.factor) }, () => setConversion({ productId: '', fromUnitId: '', toUnitId: '', factor: '' }), 'UOM conversion created')}>Add Conversion</Button>
        <Records empty={!conversions.length}>{conversions.map(row => <div key={row.id} className="flex items-center justify-between rounded border p-2 text-sm"><span>{row.product?.name} · {unitOptions.find(u => u.id === row.fromUnitId)?.label} → {row.factor} {unitOptions.find(u => u.id === row.toUnitId)?.label}</span><Button size="sm" variant="ghost" onClick={() => remove(`/inventory/uom-conversions/${row.id}`, 'conversion')}><Trash2 className="h-4 w-4" /></Button></div>)}</Records>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Batch Master</CardTitle><CardDescription>Create opening or externally supplied batches. Transaction-created batches also appear here.</CardDescription></CardHeader><CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2"><NativeSelect label="Product" value={batch.productId} onChange={productId => setBatch({ ...batch, productId })} options={productOptions} /><NativeSelect label="Warehouse" value={batch.warehouseId} onChange={warehouseId => setBatch({ ...batch, warehouseId })} options={warehouseOptions} /></div>
        <div className="grid grid-cols-2 gap-2"><Input placeholder="Batch number" value={batch.batchNo} onChange={e => setBatch({ ...batch, batchNo: e.target.value })} /><Input type="number" min="0" placeholder="Opening quantity" value={batch.quantity} onChange={e => setBatch({ ...batch, quantity: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>Manufacturing date</Label><Input type="date" value={batch.manufacturingDate} onChange={e => setBatch({ ...batch, manufacturingDate: e.target.value })} /></div><div><Label>Expiry date</Label><Input type="date" value={batch.expiryDate} onChange={e => setBatch({ ...batch, expiryDate: e.target.value })} /></div></div>
        <Button disabled={!batch.batchNo.trim() || !batch.productId || !!busy} onClick={() => submit('batch', '/inventory/batches', { ...batch, warehouseId: batch.warehouseId || undefined, quantity: Number(batch.quantity || 0), manufacturingDate: batch.manufacturingDate || undefined, expiryDate: batch.expiryDate || undefined }, () => setBatch({ batchNo: '', productId: '', warehouseId: '', quantity: '0', manufacturingDate: '', expiryDate: '', supplierBatchNo: '' }), 'Batch created')}>Add Batch</Button>
        <Records empty={!batches.length}>{batches.map(row => <div key={row.id} className="rounded border p-2 text-sm"><span className="font-medium">{row.batchNo}</span><span className="text-muted-foreground"> · {row.product?.name} · {row.warehouse?.name || 'No warehouse'} · Qty {row.quantity}</span></div>)}</Records>
      </CardContent></Card>

      <Card className="xl:col-span-2"><CardHeader><CardTitle>Serial Number Master</CardTitle><CardDescription>Create and view serial-controlled inventory identifiers.</CardDescription></CardHeader><CardContent className="space-y-2">
        <div className="grid gap-2 md:grid-cols-4"><NativeSelect label="Product" value={serial.productId} onChange={productId => setSerial({ ...serial, productId, batchId: '' })} options={productOptions} /><NativeSelect label="Warehouse" value={serial.warehouseId} onChange={warehouseId => setSerial({ ...serial, warehouseId })} options={warehouseOptions} /><div className="space-y-1.5"><Label>Serial number</Label><Input value={serial.serialNo} onChange={e => setSerial({ ...serial, serialNo: e.target.value })} /></div><div className="space-y-1.5"><Label>Purchase rate</Label><Input type="number" min="0" value={serial.purchaseRate} onChange={e => setSerial({ ...serial, purchaseRate: e.target.value })} /></div></div>
        <NativeSelect label="Batch (optional)" value={serial.batchId} onChange={batchId => setSerial({ ...serial, batchId })} options={batches.filter(row => row.productId === serial.productId).map(row => ({ id: row.id, label: row.batchNo }))} />
        <Button disabled={!serial.serialNo.trim() || !serial.productId || !!busy} onClick={() => submit('serial number', '/inventory/serial-numbers', { ...serial, warehouseId: serial.warehouseId || undefined, batchId: serial.batchId || undefined, purchaseRate: serial.purchaseRate ? Number(serial.purchaseRate) : undefined }, () => setSerial({ serialNo: '', productId: '', warehouseId: '', batchId: '', purchaseRate: '' }), 'Serial number created')}>Add Serial Number</Button>
        <Records empty={!serials.length}>{serials.map(row => <div key={row.id} className="rounded border p-2 text-sm"><span className="font-mono font-medium">{row.serialNo}</span><span className="text-muted-foreground"> · {row.product?.name} · {row.warehouse?.name || 'No warehouse'} · {row.status}</span></div>)}</Records>
      </CardContent></Card>
    </div>
    {!products.length && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Create a product before adding conversions, batches or serial numbers.</p>}
    {!warehouses.length && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Create a warehouse before assigning batch or serial stock to a location.</p>}
  </div>;
}
