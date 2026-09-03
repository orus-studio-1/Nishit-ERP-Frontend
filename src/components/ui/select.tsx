'use client';
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} className={cn('flex h-8 w-full items-center justify-between rounded-md border border-[#d9d4cc] bg-white px-2.5 py-1 text-sm text-[#1f2937] shadow-sm placeholder:text-[#9aa3af] focus:border-[#2490ef] focus:outline-none focus:ring-2 focus:ring-[#2490ef]/15 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] disabled:opacity-70', className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
  /** Always show search for API-backed lists. "auto" adds it when a list grows large. */
  searchable?: boolean | 'auto';
  searchPlaceholder?: string;
};

function nodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

function countSelectItems(node: React.ReactNode): number {
  return React.Children.toArray(node).reduce<number>((count, child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return count;
    return count + (child.type === SelectItem ? 1 : countSelectItems(child.props.children));
  }, 0);
}

function filterSelectItems(node: React.ReactNode, query: string): React.ReactNode {
  return React.Children.toArray(node).map((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return child;
    if (child.type === SelectItem) {
      return nodeText(child.props.children).toLocaleLowerCase().includes(query) ? child : null;
    }
    if (!child.props.children) return child;
    return React.cloneElement(child, undefined, filterSelectItems(child.props.children, query));
  });
}

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, SelectContentProps>(
  ({ className, children, position = 'popper', searchable = 'auto', searchPlaceholder = 'Search…', ...props }, ref) => {
    const [query, setQuery] = React.useState('');
    const itemCount = countSelectItems(children);
    const showSearch = searchable === true || (searchable === 'auto' && itemCount > 0);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredChildren = normalizedQuery ? filterSelectItems(children, normalizedQuery) : children;
    const filteredCount = normalizedQuery ? countSelectItems(filteredChildren) : itemCount;

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content data-radix-select-content ref={ref} className={cn('relative z-[70] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-md border border-[#e5e2dc] bg-white text-[#1f2937] shadow-lg shadow-gray-900/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95', position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1', className)} position={position} {...props}>
          {showSearch && (
            <div className="relative border-b border-[#e5e2dc] p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3af]" />
              <input
                autoFocus
                aria-label="Search options"
                className="h-8 w-full rounded-md border border-[#d9d4cc] bg-white pl-8 pr-2 text-sm outline-none placeholder:text-[#9aa3af] focus:border-[#2490ef] focus:ring-2 focus:ring-[#2490ef]/15"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          )}
          <SelectPrimitive.Viewport className={cn('max-h-[inherit] overflow-y-auto p-1', showSearch && 'max-h-64', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}>
            {filteredCount > 0 || !normalizedQuery ? filteredChildren : (
              <div className="px-3 py-6 text-center text-sm text-[#6b7280]">No matching options</div>
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item ref={ref} className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-[#eef6fd] focus:text-[#1f2937] data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Label>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>>(
  ({ className, ...props }, ref) => <SelectPrimitive.Label ref={ref} className={cn('px-2 py-1.5 text-xs font-semibold text-[#6b7280]', className)} {...props} />
);
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>>(
  ({ className, ...props }, ref) => <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-[#f0ede8]', className)} {...props} />
);
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
