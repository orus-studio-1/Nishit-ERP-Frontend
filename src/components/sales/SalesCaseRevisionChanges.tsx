'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Revision snapshots contain decimal and date values from the aggregate API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Change = Record<string, any>;
const value = (field: string, input: unknown, currency: string) => field.includes('Date') ? (input ? formatDate(String(input)) : '—') : ['unitPrice','total'].includes(field) ? formatCurrency(Number(input || 0), currency) : field === 'discount' || field === 'taxRate' ? `${Number(input || 0)}%` : String(input ?? '—');

export function SalesCaseRevisionChanges({ revisionNo, changes, currency }: { revisionNo: number; changes: Change[]; currency: string }) {
  if (!changes.length) return null;
  return <Card className="border-amber-200 bg-amber-50/30"><CardHeader><CardTitle className="text-base">Revision {revisionNo} line-by-line changes</CardTitle></CardHeader><CardContent className="space-y-3">{changes.map(change => <div key={`${change.productId}-${change.kind}`} className="rounded-lg border bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{change.product}</p><Badge variant={change.kind === 'REMOVED' ? 'destructive' : 'outline'}>{change.kind}</Badge></div>{change.kind === 'CHANGED' && <div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Field</th><th>Previous</th><th>Revised</th></tr></thead><tbody>{change.fields.map((field: string) => <tr key={field} className="border-t"><td className="py-2 font-medium">{field.replaceAll(/([A-Z])/g, ' $1')}</td><td className="text-muted-foreground line-through">{value(field, change.before?.[field], currency)}</td><td className="font-semibold text-amber-800">{value(field, change.after?.[field], currency)}</td></tr>)}</tbody></table></div>}{change.kind === 'ADDED' && <p className="mt-2 text-sm">Added quantity {String(change.after?.quantity)} at {formatCurrency(Number(change.after?.unitPrice || 0), currency)}.</p>}{change.kind === 'REMOVED' && <p className="mt-2 text-sm">Removed quantity {String(change.before?.quantity)} previously priced at {formatCurrency(Number(change.before?.unitPrice || 0), currency)}.</p>}</div>)}</CardContent></Card>;
}
