'use client';

import * as React from 'react';
import { useCenter } from '@/components/providers/center-provider';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export type CmsContentStatus = 'draft' | 'scheduled' | 'published';

export interface CmsStatusBadgeProps {
  status: CmsContentStatus;
  scheduledAt?: string | null;
  className?: string;
}

export function CmsStatusBadge({ status, scheduledAt, className }: CmsStatusBadgeProps) {
  const { center } = useCenter();

  if (status === 'published') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          'bg-status-success-bg text-status-success-text border-status-success-border',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-status-success" aria-hidden="true" />
        Published
      </span>
    );
  }

  if (status === 'scheduled') {
    const formatted = scheduledAt
      ? formatDateTime(scheduledAt, center.timezone, center.defaultLocale)
      : null;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          'bg-status-info-bg text-status-info-text border-status-info-border',
          className
        )}
        title={formatted ? `Scheduled for ${formatted}` : undefined}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-status-info" aria-hidden="true" />
        Scheduled{formatted ? `: ${formatted}` : ''}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        'bg-status-warning-bg text-status-warning-text border-status-warning-border',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-status-warning" aria-hidden="true" />
      Draft
    </span>
  );
}
