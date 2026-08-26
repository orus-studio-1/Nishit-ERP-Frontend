'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

interface SelectEmptyStateProps {
  message?: string;
  linkHref?: string;
  linkText?: string;
  onAction?: () => void;
  className?: string;
}

export function SelectEmptyState({
  message = 'No items found',
  linkHref,
  linkText = 'Create one',
  onAction,
  className = '',
}: SelectEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-3 text-center text-xs text-gray-500 select-none ${className}`}
      onPointerDown={(e) => {
        // Prevent Radix select item focus/dismiss interference
        e.stopPropagation();
      }}
    >
      <span className="text-gray-600 font-medium">{message}</span>
      {linkHref ? (
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-blue-200/60 shadow-xs cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>{linkText}</span>
        </Link>
      ) : onAction ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-blue-200/60 shadow-xs cursor-pointer"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>{linkText}</span>
        </button>
      ) : null}
    </div>
  );
}
