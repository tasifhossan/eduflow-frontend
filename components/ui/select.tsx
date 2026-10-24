import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isError?: boolean;
  isSuccess?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, isError, isSuccess, disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={isError ? true : undefined}
          className={cn(
            'flex h-10 w-full appearance-none rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 pr-9 text-sm text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            isError &&
              'border-danger text-foreground focus-visible:border-danger focus-visible:ring-danger/30',
            isSuccess &&
              'border-secondary focus-visible:border-secondary focus-visible:ring-secondary/30',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = 'Select';
