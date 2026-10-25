import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
  description?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  icon,
  isLoading = false,
  description,
  className = '',
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          {icon && <Skeleton className="h-8 w-8 rounded-full" />}
        </div>
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card hover:shadow-popover transition-shadow ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <div className="h-9 w-9 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-x-2">
        <span className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>

      {(trend || description) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center font-semibold ${
                trend.direction === 'up'
                  ? 'text-status-success-text'
                  : trend.direction === 'down'
                  ? 'text-status-danger-text'
                  : 'text-muted-foreground'
              }`}
            >
              {trend.direction === 'up' && '↑ '}
              {trend.direction === 'down' && '↓ '}
              {trend.value}
              {trend.label && <span className="font-normal text-muted-foreground ml-1">{trend.label}</span>}
            </span>
          )}
          {description && (
            <span className="text-muted-foreground truncate">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
