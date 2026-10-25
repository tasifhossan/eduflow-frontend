import * as React from 'react';

export type StatusVariant =
  | 'paid'
  | 'partial'
  | 'due'
  | 'present'
  | 'absent'
  | 'late'
  | 'upcoming'
  | 'closed';

export interface StatusBadgeProps {
  variant: StatusVariant;
  children?: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

const variantStyles: Record<
  StatusVariant,
  {
    container: string;
    dot: string;
    defaultLabel: string;
  }
> = {
  paid: {
    container: 'bg-status-success-bg text-status-success-text border-status-success-border',
    dot: 'bg-status-success',
    defaultLabel: 'Paid',
  },
  present: {
    container: 'bg-status-success-bg text-status-success-text border-status-success-border',
    dot: 'bg-status-success',
    defaultLabel: 'Present',
  },
  partial: {
    container: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    dot: 'bg-status-warning',
    defaultLabel: 'Partial',
  },
  late: {
    container: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    dot: 'bg-status-warning',
    defaultLabel: 'Late',
  },
  due: {
    container: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
    dot: 'bg-status-danger',
    defaultLabel: 'Due',
  },
  absent: {
    container: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
    dot: 'bg-status-danger',
    defaultLabel: 'Absent',
  },
  upcoming: {
    container: 'bg-status-info-bg text-status-info-text border-status-info-border',
    dot: 'bg-status-info',
    defaultLabel: 'Upcoming',
  },
  closed: {
    container: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    defaultLabel: 'Closed',
  },
};

export function StatusBadge({
  variant,
  children,
  showDot = false,
  className = '',
}: StatusBadgeProps) {
  const config = variantStyles[variant] || variantStyles.closed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold border ${config.container} ${className}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children ?? config.defaultLabel}</span>
    </span>
  );
}
