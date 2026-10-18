import * as React from 'react';
import { cn } from '@/lib/cn';

export interface SkipLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

export function SkipLink({
  href = '#main',
  label = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[var(--z-toast)]',
        'rounded-[var(--radius-control)] border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-popover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      {label}
    </a>
  );
}
