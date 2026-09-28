'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SlabFields } from '@/components/incentives/SlabFields';
import {
  AMOUNT_BASES, MEASUREMENT_TYPES, SLAB_MODES, TRADE_TYPES, emptySlabDraft, humanize, slabDraftPayload, toDateInput, validateSlabDraft,
  RETURN_HANDLING_MODES, DATE_BASIS_MODES, AUTO_CALCULATE_MODES,
  type AmountBasisType, type IncentiveScheme, type MeasurementType, type SlabDraft, type SlabMode, type TradeType,
  type ReturnHandlingMode, type DateBasisMode, type AutoCalculateMode
} from '@/lib/incentives';

interface SchemeForm {
  name: string;
  code: string;
  manufacturerLabel: string;
  description: string;
  bookingChannel: string;
  startDate: string;
  endDate: string;
  measurementType: MeasurementType;
  amountBasis: AmountBasisType;
  slabMode: SlabMode;
  allowAnyTradeType: boolean;
  eligibleTradeTypes: TradeType[];
  allowAnySupplier: boolean;
  eligibleSupplierIds: string[];
  rewardExcludedProductIds: string[];
  includedCategoryIds: string[];
  returnHandling: ReturnHandlingMode;
  paymentConditionDays: string;
  minInvoiceValue: string;
  eligibilityDateBasis: DateBasisMode;
  autoCalculate: AutoCalculateMode;
  eligibleBranchIds: string[];
  allowAnyBranch: boolean;
}

const emptyForm: SchemeForm = {
  name: '', code: '', manufacturerLabel: '', description: '', bookingChannel: '', startDate: '', endDate: '',
  measurementType: 'VALUE', amountBasis: 'PRE_TAX_BEFORE_DISCOUNT', slabMode: 'HIGHEST_SLAB_WINS', allowAnyTradeType: false, eligibleTradeTypes: [],
  allowAnySupplier: false, eligibleSupplierIds: [], rewardExcludedProductIds: [],
  includedCategoryIds: [], returnHandling: 'IGNORE_RETURNS', paymentConditionDays: '', minInvoiceValue: '',
  eligibilityDateBasis: 'INVOICE_DATE', autoCalculate: 'MANUAL', eligibleBranchIds: [], allowAnyBranch: true,
};

interface SchemeFormDialogProps {
  open: boolean;
  scheme: IncentiveScheme | null; // null = create
  onClose: () => void;
  onSaved: (message?: string) => void;
}

function ScrollableChecklist({
  options, value = [], onChange, disabled, searchable, searchPlaceholder = 'Search...'
}: {
  options: { id: string; label: string }[];
  value?: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState('');
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const filtered = searchable && search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;
  return (
    <div className="space-y-2">
      {searchable && options.length > 0 ? (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className="h-8 text-sm"
        />
      ) : null}
      <div className="max-h-40 overflow-y-auto rounded-md border border-[#e5e2dc] p-2 space-y-1">
        {options.length === 0 ? <p className="text-sm text-[#7c8591]">No items available</p> : null}
        {options.length > 0 && filtered.length === 0 ? <p className="text-sm text-[#7c8591]">No matches for &quot;{search}&quot;</p> : null}
        {filtered.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm text-[#374151]">
            <input type="checkbox" disabled={disabled} checked={value.includes(opt.id)} onChange={() => toggle(opt.id)} />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// Mount the form only while open so its state starts fresh each time.
export function SchemeFormDialog(props: SchemeFormDialogProps) {
  return props.open ? <SchemeFormDialogForm {...props} /> : null;
}

function schemeToForm(scheme: IncentiveScheme): SchemeForm {
  return {
    name: scheme.name, code: scheme.code ?? '', manufacturerLabel: scheme.manufacturerLabel,
    description: scheme.description ?? '', bookingChannel: scheme.bookingChannel ?? '',
    startDate: toDateInput(scheme.startDate), endDate: toDateInput(scheme.endDate),
    measurementType: scheme.measurementType, amountBasis: scheme.amountBasis, slabMode: scheme.slabMode,
    allowAnyTradeType: scheme.allowAnyTradeType, eligibleTradeTypes: scheme.eligibleTradeTypes,
    allowAnySupplier: scheme.allowAnySupplier, eligibleSupplierIds: scheme.eligibleSupplierIds, rewardExcludedProductIds: scheme.rewardExcludedProductIds ?? [],
    includedCategoryIds: scheme.includedCategoryIds ?? [], returnHandling: scheme.returnHandling ?? 'IGNORE_RETURNS',
    paymentConditionDays: scheme.paymentConditionDays !== null && scheme.paymentConditionDays !== undefined ? String(scheme.paymentConditionDays) : '',
    minInvoiceValue: scheme.minInvoiceValue ? String(scheme.minInvoiceValue) : '',
    eligibilityDateBasis: scheme.eligibilityDateBasis ?? 'INVOICE_DATE', autoCalculate: scheme.autoCalculate,
    eligibleBranchIds: scheme.eligibleBranchIds, allowAnyBranch: scheme.allowAnyBranch,
  };
}

function SchemeFormDialogForm({ scheme, onClose, onSaved }: SchemeFormDialogProps) {
  const [form, setForm] = useState<SchemeForm>(scheme ? schemeToForm(scheme) : emptyForm);
  const [slabs, setSlabs] = useState<SlabDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/suppliers', { params: { limit: 1000 } }).catch(() => null),
      api.get('/products', { params: { limit: 1000 } }).catch(() => null),
      api.get('/inventory/categories', { params: { limit: 1000 } }).catch(() => null),
      api.get('/platform/tenant').catch(() => null)
    ]).then(([supRes, prodRes, catRes, tenantRes]) => {
      if (!cancelled) {
        if (supRes?.data?.data?.items) setSuppliers(supRes.data.data.items);
        else if (supRes?.data?.data) setSuppliers(supRes.data.data);
        
        if (prodRes?.data?.data?.items) setProducts(prodRes.data.data.items);
        else if (prodRes?.data?.data) setProducts(prodRes.data.data);
        
        if (catRes?.data?.data?.items) setCategories(catRes.data.data.items);
        else if (catRes?.data?.data) setCategories(catRes.data.data);
        
        const tenantData = tenantRes?.data?.data;
        if (tenantData?.companies?.length > 0) {
          const allBranches = tenantData.companies.flatMap((c: any) => c.branches || []);
          setBranches(allBranches);
        }
      }
    });
    return () => { cancelled = true; };
  }, []);

  const set = (patch: Partial<SchemeForm>) => setForm((f) => ({ ...f, ...patch }));
  const toggleTradeType = (t: TradeType) =>
    set({ eligibleTradeTypes: form.eligibleTradeTypes.includes(t) ? form.eligibleTradeTypes.filter((x) => x !== t) : [...form.eligibleTradeTypes, t] });

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Scheme name is required';
    if (!form.manufacturerLabel.trim()) return 'Manufacturer is required';
    if (!form.startDate || !form.endDate) return 'Start and end dates are required';
    if (form.startDate > form.endDate) return 'Start date must not be after end date';
    if (!form.allowAnyTradeType && form.eligibleTradeTypes.length === 0) return 'Choose at least one eligible trade type, or allow any trade type';
    if (!form.allowAnySupplier && form.eligibleSupplierIds.length === 0) return 'Choose at least one eligible supplier, or allow any supplier';
    
    const thresholds = new Set<number>();
    for (let i = 0; i < slabs.length; i++) {
      const problem = validateSlabDraft(slabs[i], `Slab ${i + 1}`);
      if (problem) return problem;
      const t = Number(slabs[i].thresholdValue);
      if (thresholds.has(t)) return `Slab ${i + 1}: duplicate threshold ${t}`;
      thresholds.add(t);
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const problem = validate();
    if (problem) { toast.error(problem); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        manufacturerLabel: form.manufacturerLabel.trim(),
        description: form.description.trim() || null,
        bookingChannel: form.bookingChannel.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        measurementType: form.measurementType,
        amountBasis: form.amountBasis,
        slabMode: form.slabMode,
        allowAnyTradeType: form.allowAnyTradeType,
        eligibleTradeTypes: form.allowAnyTradeType ? [] : form.eligibleTradeTypes,
        allowAnySupplier: form.allowAnySupplier,
        eligibleSupplierIds: form.allowAnySupplier ? [] : form.eligibleSupplierIds,
        rewardExcludedProductIds: form.rewardExcludedProductIds,
        includedCategoryIds: form.includedCategoryIds,
        returnHandling: form.returnHandling,
        paymentConditionDays: form.paymentConditionDays.trim() ? Number(form.paymentConditionDays) : null,
        minInvoiceValue: form.minInvoiceValue.trim() ? Number(form.minInvoiceValue) : null,
        eligibilityDateBasis: form.eligibilityDateBasis,
        autoCalculate: form.autoCalculate,
        allowAnyBranch: form.allowAnyBranch,
        eligibleBranchIds: form.allowAnyBranch ? [] : form.eligibleBranchIds,
      };
      if (scheme) {
        const res = await api.put(`/incentives/schemes/${scheme.id}`, payload);
        showApiSuccess(res.data?.message || 'Incentive scheme updated');
        onSaved(res.data?.message);
      } else {
        await api.post('/incentives/schemes', { ...payload, slabs: slabs.map(slabDraftPayload) });
        showApiSuccess('Incentive scheme created');
        onSaved();
      }
      onClose();
    } catch (err) {
      showApiError(err, scheme ? 'Failed to update scheme' : 'Failed to create scheme');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{scheme ? 'Edit Incentive Scheme' : 'New Incentive Scheme'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Scheme name *</Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Manufacturer *</Label>
            <Input value={form.manufacturerLabel} onChange={(e) => set({ manufacturerLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Booking channel</Label>
            <Input value={form.bookingChannel} onChange={(e) => set({ bookingChannel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Start date *</Label>
            <Input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End date *</Label>
            <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
          
          <div className="space-y-1.5">
            <Label>Measured by *</Label>
            <Select value={form.measurementType} onValueChange={(v) => set({ measurementType: v as MeasurementType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEASUREMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount basis</Label>
            <Select value={form.amountBasis} onValueChange={(v) => set({ amountBasis: v as AmountBasisType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AMOUNT_BASES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Slab mode</Label>
            <Select value={form.slabMode} onValueChange={(v) => set({ slabMode: v as SlabMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SLAB_MODES.map((m) => <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Return Handling</Label>
            <Select value={form.returnHandling} onValueChange={(v) => set({ returnHandling: v as ReturnHandlingMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RETURN_HANDLING_MODES.map((m) => <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date Basis</Label>
            <Select value={form.eligibilityDateBasis} onValueChange={(v) => set({ eligibilityDateBasis: v as DateBasisMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DATE_BASIS_MODES.map((m) => <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Auto-Calculate Trigger</Label>
            <Select value={form.autoCalculate} onValueChange={(v) => set({ autoCalculate: v as AutoCalculateMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUTO_CALCULATE_MODES.map((m) => <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Min Invoice Value (₹)</Label>
            <Input type="number" min="0" value={form.minInvoiceValue} onChange={(e) => set({ minInvoiceValue: e.target.value })} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Terms Condition (Days)</Label>
            <Input type="number" min="0" value={form.paymentConditionDays} onChange={(e) => set({ paymentConditionDays: e.target.value })} placeholder="e.g. 30" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Eligible trade types</Label>
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input type="checkbox" checked={form.allowAnyTradeType} onChange={(e) => set({ allowAnyTradeType: e.target.checked })} />
              Allow any trade type (ignores the list below)
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TRADE_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-[#374151]">
                  <input type="checkbox" disabled={form.allowAnyTradeType} checked={form.eligibleTradeTypes.includes(t)} onChange={() => toggleTradeType(t)} />
                  {humanize(t)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Eligible Suppliers</Label>
            <label className="flex items-center gap-2 text-sm text-[#374151] mb-2">
              <input type="checkbox" checked={form.allowAnySupplier} onChange={(e) => set({ allowAnySupplier: e.target.checked })} />
              Allow any supplier
            </label>
            <ScrollableChecklist
              disabled={form.allowAnySupplier}
              options={suppliers.map(s => ({ id: s.id, label: s.name }))}
              value={form.eligibleSupplierIds}
              onChange={(v) => set({ eligibleSupplierIds: v })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Products excluded from reward</Label>
            <p className="text-xs text-[#7c8591]">These products count towards the slab threshold, but earn no reward amount.</p>
            <ScrollableChecklist
              searchable
              searchPlaceholder="Search products..."
              options={products.map(p => ({ id: p.id, label: `${p.name} (${p.sku})` }))}
              value={form.rewardExcludedProductIds}
              onChange={(v) => set({ rewardExcludedProductIds: v })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t sm:col-span-2">
            <h4 className="text-sm font-medium">Eligible Categories</h4>
            <p className="text-xs text-[#7c8591]">If any categories are selected, ONLY products from these categories will be eligible.</p>
            <ScrollableChecklist
              options={categories.map(c => ({ id: c.id, label: c.name }))}
              value={form.includedCategoryIds || []}
              onChange={(v) => set({ includedCategoryIds: v })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Eligible Branches</Label>
            <label className="flex items-center gap-2 text-sm text-[#374151] mb-2">
              <input type="checkbox" checked={form.allowAnyBranch} onChange={(e) => set({ allowAnyBranch: e.target.checked })} />
              Allow any branch
            </label>
            <ScrollableChecklist
              disabled={form.allowAnyBranch}
              options={branches.map(b => ({ id: b.id, label: b.name }))}
              value={form.eligibleBranchIds}
              onChange={(v) => set({ eligibleBranchIds: v })}
            />
          </div>

          {!scheme && (
            <div className="space-y-3 sm:col-span-2 mt-4">
              <div className="flex items-center justify-between">
                <Label>Slabs</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setSlabs((s) => [...s, emptySlabDraft()])}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Add slab
                </Button>
              </div>
              {slabs.length === 0 && <p className="text-xs text-[#7c8591]">Slabs can be added now or later from the scheme page. A scheme needs at least one slab before it can be activated.</p>}
              {slabs.map((slab, i) => (
                <div key={i} className="rounded-md border border-[#e5e2dc] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-[#6b7280]">Slab {i + 1}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSlabs((s) => s.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <SlabFields value={slab} measurementType={form.measurementType} onChange={(next) => setSlabs((s) => s.map((x, j) => (j === i ? next : x)))} />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : scheme ? 'Save Changes' : 'Create Scheme'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
