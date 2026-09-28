'use client';
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
}

/** Dropdown multi-select: closed by default, trigger shows a "N selected" summary instead of
 * an always-expanded checklist. Styled to match the single-select Select component. */
export function MultiSelect({
  options, value, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…',
  disabled, className, emptyText = 'No options available',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery ? options.filter((o) => o.label.toLocaleLowerCase().includes(normalizedQuery)) : options;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-[#d9d4cc] bg-white px-2.5 py-1 text-sm text-[#1f2937] shadow-sm focus:border-[#2490ef] focus:outline-none focus:ring-2 focus:ring-[#2490ef]/15 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] disabled:opacity-70',
            className,
          )}
        >
          <span className={cn('truncate text-left', value.length === 0 && 'text-[#9aa3af]')}>
            {value.length === 0 ? placeholder : value.length === 1 ? selectedLabels[0] : `${value.length} selected`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-[14rem] overflow-hidden rounded-md border border-[#e5e2dc] bg-white text-[#1f2937] shadow-lg shadow-gray-900/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="relative border-b border-[#e5e2dc] p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3af]" />
            <input
              autoFocus
              aria-label="Search options"
              className="h-8 w-full rounded-md border border-[#d9d4cc] bg-white pl-8 pr-2 text-sm outline-none placeholder:text-[#9aa3af] focus:border-[#2490ef] focus:ring-2 focus:ring-[#2490ef]/15"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {value.length > 0 && (
            <button
              type="button"
              className="w-full border-b border-[#e5e2dc] px-3 py-1.5 text-left text-xs text-[#2490ef] hover:bg-[#eef6fd]"
              onClick={() => onChange([])}
            >
              Clear selection ({value.length})
            </button>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[#6b7280]">{options.length === 0 ? emptyText : 'No matching options'}</div>
            ) : (
              filtered.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-[#eef6fd]">
                  <input type="checkbox" checked={value.includes(opt.value)} onChange={() => toggle(opt.value)} className="h-3.5 w-3.5 rounded border-[#d9d4cc]" />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
