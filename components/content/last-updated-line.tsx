'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { useCenter } from '@/components/providers/center-provider';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface LastUpdatedLineProps {
  updatedAt?: string | Date | null;
  updatedByName?: string | null;
  className?: string;
}

export function LastUpdatedLine({
  updatedAt,
  updatedByName,
  className,
}: LastUpdatedLineProps) {
  const { center } = useCenter();

  if (!updatedAt) return null;

  const formatted = formatDateTime(updatedAt, center.timezone, center.defaultLocale);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>
        Last updated{updatedByName ? ` by ${updatedByName}` : ''} on {formatted}
      </span>
    </div>
  );
}
