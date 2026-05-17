import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-brand-50 text-brand-900',
        success: 'bg-success-50 text-success-500',
        warning: 'bg-warning-50 text-warning-500',
        danger: 'bg-danger-50 text-danger-500',
        ai: 'bg-ai-50 text-ai-text border border-ai-200',
        personal: 'bg-personal-badge-bg text-personal-accent',
        muted: 'bg-neutral-100 text-neutral-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
