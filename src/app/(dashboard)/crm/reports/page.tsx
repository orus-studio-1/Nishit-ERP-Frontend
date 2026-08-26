'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { showApiError } from '@/lib/apiError';

const reports = [
  ['summary', 'Summary'], ['conversion-funnel', 'Conversion Funnel'], ['sales-rep-leaderboard', 'Sales Leaderboard'],
  ['source-campaign', 'Sources & Campaigns'], ['lead-ageing', 'Lead Ageing'], ['weighted-pipeline', 'Weighted Forecast'],
  ['lost-reasons', 'Lost Reasons'], ['activity-performance', 'Activity Performance'],
];

export default function CrmReportsPage() {
  const [type, setType] = useState('summary');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api.get(`/crm/reports/${type}`).then((res) => setData(res.data.data)).catch((err) => showApiError(err, 'Could not load CRM report')).finally(() => setLoading(false)); }, [type]);
  return <div><PageHeader title="CRM Reports" description="Funnel, productivity, ageing, source, loss and weighted-pipeline analysis" />
    <div className="mb-4 flex flex-wrap gap-2">{reports.map(([key, label]) => <Button key={key} size="sm" variant={type === key ? 'default' : 'outline'} onClick={() => setType(key)}>{label}</Button>)}</div>
    <Card><CardHeader><CardTitle>{reports.find(([key]) => key === type)?.[1]}</CardTitle></CardHeader><CardContent>{loading ? <p className="text-sm text-gray-500">Loading report…</p> : Array.isArray(data) ? <div className="overflow-auto"><table className="w-full text-sm"><tbody>{data.map((row: any, index: number) => <tr key={row.id || row.name || index} className="border-b"><td className="p-2 font-medium">{row.name || row.title || row.userId || `Row ${index + 1}`}</td><td className="p-2 text-right text-gray-600">{row.count ?? row.weightedValue ?? row.value ?? row.ageDays ?? row.won ?? '—'}</td></tr>)}</tbody></table></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data || {}).map(([key, value]) => <div key={key} className="rounded-lg border p-4"><p className="text-xs uppercase text-gray-500">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 text-2xl font-semibold">{String(value)}</p></div>)}</div>}</CardContent></Card>
  </div>;
}
