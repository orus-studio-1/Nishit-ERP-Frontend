import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-8 w-full rounded-md border border-[#d9d4cc] bg-white px-2.5 py-1 text-sm text-[#1f2937] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#9aa3af] focus-visible:border-[#2490ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ef]/15 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] disabled:opacity-70',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
