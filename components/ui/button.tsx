import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// design.md §12.1 + variants 추가: ai, personal, consensus
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700',
        outline:
          'border border-neutral-200 bg-neutral-0 text-neutral-800 hover:bg-neutral-50',
        ghost: 'text-neutral-800 hover:bg-neutral-100',
        ai: 'bg-ai-50 text-ai-text border border-ai-200 hover:bg-ai-200/40',
        personal:
          'bg-personal-badge-bg text-personal-accent border border-personal-border hover:bg-personal-border/40',
        consensus: 'bg-success-500 text-white hover:bg-success-500/90',
        destructive: 'bg-danger-500 text-white hover:bg-danger-500/90',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-10 px-5 py-2.5 text-base',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
