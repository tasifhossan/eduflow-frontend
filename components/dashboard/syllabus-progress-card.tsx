'use client';

import * as React from 'react';
import { BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export interface ChapterProgressItem {
  id: string;
  title: string;
  order: number;
  covered: boolean;
  lastCoveredAt: string | null;
}

export interface SyllabusProgressData {
  batchId: string;
  subject: {
    id: string;
    name: string;
    chapters: ChapterProgressItem[];
  } | null;
  totalChapters: number;
  coveredChapters: number;
  progressPercentage: number;
}

export interface SyllabusProgressCardProps {
  batchId?: string;
  studentId?: string;
  compact?: boolean;
  className?: string;
}

export function SyllabusProgressCard({
  batchId,
  studentId,
  compact = false,
  className = '',
}: SyllabusProgressCardProps) {
  const { center } = useCenter();
  const [data, setData] = React.useState<SyllabusProgressData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        let targetBatchId = batchId;
        if (!targetBatchId) {
          let bUrl = '/api/batches?limit=1';
          if (studentId) bUrl += `&studentId=${studentId}`;
          const batchesRes = await apiGet<{
            success: boolean;
            data: { items?: Array<{ id: string }> } | Array<{ id: string }>;
          }>(bUrl).catch(() => null);

          const bList = Array.isArray(batchesRes?.data)
            ? batchesRes.data
            : batchesRes?.data?.items || [];
          targetBatchId = bList[0]?.id;
        }

        if (!targetBatchId) {
          if (active) setIsLoading(false);
          return;
        }

        const res = await apiGet<{ success: boolean; data: SyllabusProgressData }>(
          `/api/batches/${targetBatchId}/syllabus-progress`
        );
        if (!active) return;
        if (res?.success && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setError('Failed to load syllabus progress');
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load syllabus progress';
        setError(msg);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [batchId, studentId, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className={`p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-[var(--radius-pill)]" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load syllabus progress"
        message={error}
        onRetry={handleRetry}
        className={className}
      />
    );
  }

  const subject = data?.subject;
  const chapters = subject?.chapters || [];
  const pct = data?.progressPercentage ?? 0;
  const coveredCount = data?.coveredChapters ?? 0;
  const totalCount = data?.totalChapters ?? 0;

  if (!subject || chapters.length === 0) {
    return (
      <div className={`p-6 rounded-[var(--radius-card)] border border-border bg-surface ${className}`}>
        <EmptyState
          icon={<BookOpen className="h-6 w-6 stroke-[1.5]" />}
          title="No syllabus chapters"
          description={
            subject
              ? `No chapters have been configured for ${subject.name} yet.`
              : 'No subject is currently assigned to this batch.'
          }
        />
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {subject.name} Syllabus
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {coveredCount} of {totalCount} chapters completed
          </p>
        </div>
        <span className="text-base font-extrabold font-heading text-primary">
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${subject.name} syllabus progress`}
        className="w-full bg-muted border border-border rounded-[var(--radius-pill)] h-2.5 mb-4 overflow-hidden"
      >
        <div
          className="bg-primary h-full rounded-[var(--radius-pill)] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      {/* Chapters list */}
      <div
        className={`divide-y divide-border ${
          compact ? 'max-h-48 overflow-y-auto custom-scrollbar' : 'space-y-1'
        }`}
      >
        {chapters.map((chap, idx) => {
          return (
            <div
              key={chap.id}
              className="py-2 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {chap.covered ? (
                  <CheckCircle2
                    className="h-4 w-4 text-secondary shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="h-4 w-4 text-muted-foreground/40 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`truncate ${
                    chap.covered
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="font-semibold text-muted-foreground mr-1.5">
                    {idx + 1}.
                  </span>
                  {chap.title}
                </span>
              </div>

              {chap.covered && chap.lastCoveredAt ? (
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDate(chap.lastCoveredAt, center?.timezone || 'Asia/Dhaka')}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 shrink-0">
                  Pending
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
