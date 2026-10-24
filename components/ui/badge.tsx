import * as React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    primary: 'bg-primary-subtle text-primary border-primary/20',
    secondary: 'bg-secondary-subtle text-secondary border-secondary/20',
    accent: 'bg-accent-subtle text-accent-foreground border-accent/30 font-semibold',
    success: 'bg-secondary-subtle text-secondary border-secondary/20',
    warning: 'bg-accent-subtle text-accent-foreground border-accent/30',
    danger: 'bg-danger-subtle text-danger border-danger/20',
    neutral: 'bg-muted text-muted-foreground border-border',
    outline: 'bg-transparent text-foreground border-border',
  };

  const sizes: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-[11px] font-medium leading-none',
    md: 'px-2.5 py-1 text-xs font-semibold leading-tight',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border transition-colors select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
