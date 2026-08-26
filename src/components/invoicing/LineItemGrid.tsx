'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

import { LineItemSummary } from './LineItemSummary';
import { blankRow, calculateLineSummary, computeRow, type LineItemRow, type ProductOption } from './LineItemGrid.helpers';

export type { LineItemRow } from './LineItemGrid.helpers';
export { calculateLineSummary } from './LineItemGrid.helpers';

interface LineItemGridProps {
  value: LineItemRow[];
  onChange?: (rows: LineItemRow[]) => void;
  currency?: string;
  readOnly?: boolean;
  className?: string;
}

interface TaxTemplateOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  lines?: { label: string; rate: number }[];
}

function templateRate(template?: TaxTemplateOption | null) {
  return (template?.lines || []).reduce((sum, line) => sum + Number(line.rate || 0), 0);
}

export function LineItemGrid({ value, onChange, currency = 'USD', readOnly = false, className }: LineItemGridProps) {
  const rows = value.length ? value : [blankRow()];
  const [activeLookup, setActiveLookup] = useState<number | null>(null);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplateOption[]>([]);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const columns = ['product', 'description', 'quantity', 'unitPrice', 'discount', 'taxRate'];

  const summary = useMemo(() => calculateLineSummary(rows), [rows]);

  useEffect(() => {
    api.get('/invoicing/tax-templates')
      .then(res => setTaxTemplates((Array.isArray(res.data?.data) ? res.data.data : []).filter((template: TaxTemplateOption) => template.isActive)))
      .catch(() => setTaxTemplates([]));
  }, []);

  useEffect(() => {
    if (activeLookup === null) return;
    const query = queries[activeLookup]?.trim();
    if (!query) {
      setOptions([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const res = await api.get('/products/search', { params: { q: query } });
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setOptions(data);
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [activeLookup, queries]);

  const emit = (next: LineItemRow[]) => onChange?.(next.map(computeRow));

  const updateRow = (index: number, patch: Partial<LineItemRow>) => {
    const next = rows.map((row, idx) => (idx === index ? computeRow({ ...row, ...patch }) : row));
    emit(next);
  };

  const ensureTrailingRow = (index: number, text: string) => {
    if (index === rows.length - 1 && text.trim()) {
      emit([...rows, blankRow()]);
    }
  };

  const selectProduct = (index: number, product: ProductOption) => {
    const defaultTemplate = product.defaultTaxTemplateId ? taxTemplates.find(template => template.id === product.defaultTaxTemplateId) : null;
    updateRow(index, {
      productId: product.id,
      itemCode: product.sku,
      description: product.name,
      unitPrice: Number(product.salePrice) || 0,
      taxTemplateId: defaultTemplate?.id || product.defaultTaxTemplateId || '',
      taxTemplateName: defaultTemplate?.name || product.defaultTaxTemplate?.name || '',
      taxRate: defaultTemplate ? templateRate(defaultTemplate) : Number(product.taxRate) || 0,
    });
    setQueries(prev => ({ ...prev, [index]: product.sku }));
    setActiveLookup(null);
    setOptions([]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    emit(rows.filter((_, idx) => idx !== index));
  };

  const focusCell = (rowIndex: number, columnIndex: number) => {
    const row = Math.max(0, Math.min(rows.length - 1, rowIndex));
    const col = Math.max(0, Math.min(columns.length - 1, columnIndex));
    cellRefs.current[`${row}-${columns[col]}`]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, column: string) => {
    const columnIndex = columns.indexOf(column);
    if (event.key === 'Escape') {
      setActiveLookup(null);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      focusCell(rowIndex + 1, columnIndex);
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const nextColumn = event.shiftKey ? columnIndex - 1 : columnIndex + 1;
      if (nextColumn >= columns.length) focusCell(rowIndex + 1, 0);
      else if (nextColumn < 0) focusCell(rowIndex - 1, columns.length - 1);
      else focusCell(rowIndex, nextColumn);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusCell(rowIndex + 1, columnIndex);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusCell(rowIndex - 1, columnIndex);
    }
  };

  if (readOnly) {
    return (
      <div className={cn('overflow-hidden rounded-md border border-[#dfe3e8] bg-white', className)}>
        <table className="w-full text-sm">
          <thead className="bg-[#f7f8fa] text-xs font-medium text-[#6b7280]">
            <tr>
              <th className="w-10 px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Disc %</th>
              <th className="px-3 py-2 text-left">Tax Template</th>
              <th className="px-3 py-2 text-right">Tax %</th>
              <th className="px-3 py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede8]">
            {rows.map((row, index) => (
              <tr key={row.id || index}>
                <td className="px-3 py-2 text-xs text-[#9aa3af]">{index + 1}</td>
                <td className="px-3 py-2 font-mono text-xs text-[#1674c4]">{row.itemCode || row.productId || '-'}</td>
                <td className="px-3 py-2">{row.description || '-'}</td>
                <td className="px-3 py-2 text-right">{row.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.unitPrice, currency)}</td>
                <td className="px-3 py-2 text-right">{row.discount}</td>
                <td className="px-3 py-2">{row.taxTemplateName || row.taxTemplateId || 'Manual'}</td>
                <td className="px-3 py-2 text-right">{row.taxRate}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <LineItemSummary summary={summary} currency={currency} />
      </div>
    );
  }

  return (
    <div className={cn('overflow-visible rounded-md border border-[#dfe3e8] bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] border-separate border-spacing-0 text-sm">
          <thead className="bg-[#f7f8fa] text-xs font-medium text-[#6b7280]">
            <tr>
              <th className="w-10 border-b border-[#dfe3e8] px-2 py-2 text-left">#</th>
              <th className="w-[210px] border-b border-[#dfe3e8] px-2 py-2 text-left">Item</th>
              <th className="border-b border-[#dfe3e8] px-2 py-2 text-left">Description</th>
              <th className="w-[92px] border-b border-[#dfe3e8] px-2 py-2 text-right">Qty</th>
              <th className="w-[120px] border-b border-[#dfe3e8] px-2 py-2 text-right">Rate</th>
              <th className="w-[92px] border-b border-[#dfe3e8] px-2 py-2 text-right">Disc %</th>
              <th className="w-[180px] border-b border-[#dfe3e8] px-2 py-2 text-left">Tax Template</th>
              <th className="w-[92px] border-b border-[#dfe3e8] px-2 py-2 text-right">Tax %</th>
              <th className="w-[130px] border-b border-[#dfe3e8] px-2 py-2 text-right">Amount</th>
              <th className="w-[44px] border-b border-[#dfe3e8] px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || index} className="group">
                <td className="border-b border-[#f0ede8] px-2 py-1.5 text-xs text-[#9aa3af]">{index + 1}</td>
                <td className="relative border-b border-[#f0ede8] px-2 py-1.5">
                  <Input
                    className="h-7 border-transparent bg-transparent shadow-none hover:border-[#d9d4cc] focus-visible:bg-white"
                    ref={node => { cellRefs.current[`${index}-product`] = node; }}
                    value={queries[index] ?? row.itemCode ?? ''}
                    onFocus={() => setActiveLookup(index)}
                    onKeyDown={event => handleKeyDown(event, index, 'product')}
                    onChange={event => {
                      const text = event.target.value;
                      setQueries(prev => ({ ...prev, [index]: text }));
                      updateRow(index, { itemCode: text, productId: text ? row.productId : '' });
                      ensureTrailingRow(index, text);
                      setActiveLookup(index);
                    }}
                    placeholder="Item code"
                  />
                  {activeLookup === index && (queries[index]?.trim() ? (
                    options.length > 0 ? (
                      <div className="absolute left-2 right-2 top-11 z-30 max-h-56 overflow-y-auto rounded-md border border-[#e5e2dc] bg-white shadow-lg">
                        {options.map(option => (
                          <button
                            key={option.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#eef6fd]"
                            onMouseDown={event => {
                              event.preventDefault();
                              selectProduct(index, option);
                            }}
                          >
                            <span>
                              <span className="block font-mono text-xs text-[#1674c4]">{option.sku}</span>
                              <span className="block text-sm text-[#1f2937]">{option.name}</span>
                            </span>
                            <span className="text-xs text-[#6b7280]">{formatCurrency(option.salePrice, currency)} · {option.taxRate}%</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute left-2 right-2 top-11 z-30 flex items-center justify-between gap-2 rounded-md border border-[#e5e2dc] bg-white p-2.5 shadow-lg text-xs">
                        <span className="text-gray-500">No matching products found</span>
                        <Link
                          href="/inventory/products"
                          className="font-semibold text-blue-600 hover:text-blue-800 underline shrink-0"
                          onMouseDown={e => e.preventDefault()}
                        >
                          Create Product &rarr;
                        </Link>
                      </div>
                    )
                  ) : null)}
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Input className="h-7 border-transparent bg-transparent shadow-none hover:border-[#d9d4cc] focus-visible:bg-white" ref={node => { cellRefs.current[`${index}-description`] = node; }} value={row.description} onKeyDown={event => handleKeyDown(event, index, 'description')} onChange={event => updateRow(index, { description: event.target.value })} />
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Input ref={node => { cellRefs.current[`${index}-quantity`] = node; }} className="h-7 border-transparent bg-transparent text-right shadow-none hover:border-[#d9d4cc] focus-visible:bg-white" type="number" step="0.01" value={row.quantity} onKeyDown={event => handleKeyDown(event, index, 'quantity')} onChange={event => updateRow(index, { quantity: Number(event.target.value) })} />
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Input ref={node => { cellRefs.current[`${index}-unitPrice`] = node; }} className="h-7 border-transparent bg-transparent text-right shadow-none hover:border-[#d9d4cc] focus-visible:bg-white" type="number" step="0.01" value={row.unitPrice} onKeyDown={event => handleKeyDown(event, index, 'unitPrice')} onChange={event => updateRow(index, { unitPrice: Number(event.target.value) })} />
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Input ref={node => { cellRefs.current[`${index}-discount`] = node; }} className="h-7 border-transparent bg-transparent text-right shadow-none hover:border-[#d9d4cc] focus-visible:bg-white" type="number" step="0.01" value={row.discount} onKeyDown={event => handleKeyDown(event, index, 'discount')} onChange={event => updateRow(index, { discount: Number(event.target.value) })} />
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Select
                    value={row.taxTemplateId || 'MANUAL'}
                    onValueChange={value => {
                      if (value === 'MANUAL') {
                        updateRow(index, { taxTemplateId: '', taxTemplateName: '' });
                        return;
                      }
                      const template = taxTemplates.find(item => item.id === value);
                      updateRow(index, { taxTemplateId: value, taxTemplateName: template?.name || '', taxRate: templateRate(template) });
                    }}
                  >
                    <SelectTrigger className="h-7 border-transparent bg-transparent shadow-none hover:border-[#d9d4cc] focus-visible:bg-white">
                      <SelectValue placeholder="Manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual tax %</SelectItem>
                      {taxTemplates.map(template => <SelectItem key={template.id} value={template.id}>{template.code} · {template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Input ref={node => { cellRefs.current[`${index}-taxRate`] = node; }} className="h-7 border-transparent bg-transparent text-right shadow-none hover:border-[#d9d4cc] focus-visible:bg-white" type="number" step="0.01" value={row.taxRate} onKeyDown={event => handleKeyDown(event, index, 'taxRate')} onChange={event => updateRow(index, { taxRate: Number(event.target.value), taxTemplateId: row.taxTemplateId })} />
                </td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5 text-right font-semibold">{formatCurrency(row.total, currency)}</td>
                <td className="border-b border-[#f0ede8] px-2 py-1.5">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-[#c3423f] opacity-0 group-hover:opacity-100" disabled={rows.length === 1} onClick={() => removeRow(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 border-t border-[#f0ede8] bg-white px-3 py-2">
        <Button type="button" variant="outline" size="sm" onClick={() => emit([...rows, blankRow()])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Row
        </Button>
        <Button type="button" variant="ghost" size="sm">Add Multiple</Button>
      </div>
      <LineItemSummary summary={summary} currency={currency} />
    </div>
  );
}
