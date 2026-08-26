import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-900',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'text-gray-700',
        success: 'border-transparent bg-green-100 text-green-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        info: 'border-transparent bg-blue-100 text-blue-700',
        purple: 'border-transparent bg-purple-100 text-purple-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
