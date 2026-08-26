import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ef]/25 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-[#2490ef] text-white shadow-sm shadow-[#2490ef]/20 hover:bg-[#1674c4]',
        destructive: 'bg-[#c3423f] text-white shadow-sm shadow-red-900/10 hover:bg-[#a93634]',
        outline: 'border border-[#d9d4cc] bg-white text-[#383838] shadow-sm hover:border-[#c8c1b8] hover:bg-[#f8faf9]',
        secondary: 'border border-[#e5e2dc] bg-[#f4f5f6] text-[#383838] hover:bg-[#eceff1]',
        ghost: 'text-[#4b5563] hover:bg-[#eef3f5] hover:text-[#1f2937]',
        link: 'text-[#1674c4] underline-offset-4 hover:underline',
        success: 'bg-[#0f9d58] text-white shadow-sm shadow-green-900/10 hover:bg-[#0c8048]',
        warning: 'bg-[#d98324] text-white shadow-sm shadow-amber-900/10 hover:bg-[#b86c1d]',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 rounded-md px-2.5 text-xs',
        lg: 'h-9 rounded-md px-5',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
