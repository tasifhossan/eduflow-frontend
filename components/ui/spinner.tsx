import * as React from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({
  size = 'md',
  label = 'Loading...',
  className,
  ...props
}: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  return (
    <div
      role="status"
      className={cn('inline-flex items-center justify-center text-primary', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizes[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
