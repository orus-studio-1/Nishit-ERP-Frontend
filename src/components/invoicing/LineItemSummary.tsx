'use client';

import { formatCurrency } from '@/lib/utils';
import { calculateLineSummary } from './LineItemGrid.helpers';

export function LineItemSummary({ summary, currency }: { summary: ReturnType<typeof calculateLineSummary>; currency: string }) {
  return (
    <div className="border-t border-[#f0ede8] bg-[#fbfaf8] px-4 py-3">
      <div className="ml-auto grid max-w-sm grid-cols-2 gap-y-1 text-sm">
        <span className="text-[#6b7280]">Subtotal</span>
        <span className="text-right font-medium">{formatCurrency(summary.subtotal, currency)}</span>
        <span className="text-[#6b7280]">Discount</span>
        <span className="text-right font-medium">{formatCurrency(summary.discount, currency)}</span>
        <span className="text-[#6b7280]">Tax</span>
        <span className="text-right font-medium">{formatCurrency(summary.taxAmount, currency)}</span>
        <span className="pt-1 font-semibold text-[#1f2937]">Total</span>
        <span className="pt-1 text-right font-semibold text-[#1f2937]">{formatCurrency(summary.total, currency)}</span>
      </div>
    </div>
  );
}
