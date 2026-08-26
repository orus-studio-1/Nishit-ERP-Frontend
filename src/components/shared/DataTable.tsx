'use client';
import { Skeleton } from '@/components/ui/skeleton';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyField?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, data, isLoading, keyField = 'id', emptyMessage = 'No records found', onRowClick }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#e5e2dc] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[#e5e2dc] bg-[#f8faf9]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 text-left text-xs font-semibold uppercase text-[#6b7280] ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0ede8] bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#8a929d]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={item[keyField]}
                className={`transition-colors hover:bg-[#f8faf9] ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 text-[#374151] ${col.className || ''}`}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
