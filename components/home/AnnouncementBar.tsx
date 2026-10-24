'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnnouncementSettings } from '@/lib/types/center';
import { ArrowRight, X } from 'lucide-react';

export interface AnnouncementBarProps {
  announcement?: AnnouncementSettings;
}

export function AnnouncementBar({ announcement }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (!announcement?.enabled || !announcement.text) return;
    try {
      const isDismissed = sessionStorage.getItem('eduflow_announcement_dismissed');
      if (!isDismissed) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, [announcement]);

  if (dismissed || !announcement?.enabled || !announcement.text) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('eduflow_announcement_dismissed', 'true');
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  return (
    <div className="relative isolate z-40 flex items-center justify-between gap-x-4 bg-primary px-4 py-2.5 sm:px-6 text-primary-foreground text-xs sm:text-sm font-medium shadow-sm transition-colors">
      <div className="flex flex-1 items-center justify-center gap-x-2 text-center truncate">
        <span className="truncate">{announcement.text}</span>
        {announcement.linkLabel && announcement.linkUrl && (
          <Link
            href={announcement.linkUrl}
            className="inline-flex items-center gap-1 font-bold underline hover:opacity-90 shrink-0 ml-1"
          >
            <span>{announcement.linkLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="rounded-[var(--radius-control)] p-1 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground shrink-0 transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
