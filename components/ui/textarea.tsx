import * as React from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
  isSuccess?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isError, isSuccess, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={isError ? true : undefined}
        className={cn(
          'flex min-h-[80px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          isError &&
            'border-danger text-foreground focus-visible:border-danger focus-visible:ring-danger/30',
          isSuccess &&
            'border-secondary focus-visible:border-secondary focus-visible:ring-secondary/30',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
