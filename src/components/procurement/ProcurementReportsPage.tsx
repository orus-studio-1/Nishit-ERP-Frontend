'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { showApiError } from '@/lib/apiError';

const reports = [
  ['Vendor rating', 'vendor-rating'], ['Purchase analysis', 'purchase-analysis'], ['Item/vendor price trend', 'price-trend'],
  ['Pending GRN', 'pending-grn'], ['GR/IR reconciliation', 'gr-ir'], ['PO overdue', 'po-overdue'],
  ['PO ageing', 'po-ageing'], ['Rejection analysis', 'rejections'], ['MSME overdue', 'msme-overdue'],
  ['Advance outstanding', 'advance-outstanding'], ['Spend by vendor', 'spend'],
];

export function ProcurementReportsPage() {
  const [type, setType] = useState('vendor-rating');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  async function load(selected = type) {
    setLoading(true);
    try { const response = await api.get(`/procurement/reports/${selected}`); setRows(Array.isArray(response.data?.data) ? response.data.data : []); }
    catch (error) { showApiError(error, 'Unable to load procurement report'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(type); }, [type]);
  return <div className="space-y-4">
    <PageHeader title="Procurement Reports" description="Sourcing, GRN, matching, statutory, vendor-performance and spend controls" />
    <div className="flex flex-wrap gap-2">{reports.map(([label, key]) => <Button key={key} variant={type === key ? 'default' : 'outline'} size="sm" onClick={() => setType(key)}>{label}</Button>)}</div>
    <div className="overflow-auto rounded-md border bg-white">
      {loading ? <p className="p-6 text-sm text-gray-500">Loading report…</p> : !rows.length ? <p className="p-6 text-sm text-gray-500">No records for this report.</p> : <table className="w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr>{Object.keys(rows[0]).slice(0, 8).map(key => <th key={key} className="p-3 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index} className="border-b hover:bg-gray-50"><>{Object.keys(rows[0]).slice(0, 8).map(key => <td key={key} className="max-w-64 p-3">{displayValue(row[key])}</td>)}</></tr>)}</tbody></table>}
    </div>
  </div>;
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? `${value.length} record${value.length === 1 ? '' : 's'}` : 'None';
  if (typeof value === 'object') return value.name || value.poNo || value.requestNo || value.sku || value.code || 'Linked record';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
