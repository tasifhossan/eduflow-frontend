'use client';

import * as React from 'react';
import { Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';

export interface StudentAccessRecord {
  studentId: string;
  studentName: string;
  studentCode: string;
  studentEmail: string;
  opened: boolean;
  firstAccessAt: string | null;
  lastAccessAt: string | null;
  accessCount: number;
}

export interface WhoOpenedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
}

export function WhoOpenedDrawer({
  isOpen,
  onClose,
  materialId,
  materialTitle,
}: WhoOpenedDrawerProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const [records, setRecords] = React.useState<StudentAccessRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !materialId) return;

    let active = true;

    apiGet<{ success: boolean; data: StudentAccessRecord[] }>(`/api/materials/${materialId}/access`)
      .then((res) => {
        if (!active) return;
        if (res?.success && Array.isArray(res.data)) {
          setRecords(res.data);
        } else {
          setRecords([]);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load access logs');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, materialId]);

  const openedCount = records.filter((r) => r.opened).length;
  const totalCount = records.length;
  const openedPercent = totalCount > 0 ? Math.round((openedCount / totalCount) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Learner Access Activity"
      description={`Tracking read engagement for "${materialTitle}"`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Engagement stat summary */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Enrollees</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{totalCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Opened</p>
            <p className="text-lg font-bold text-secondary mt-0.5">{openedCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Engagement</p>
            <p className="text-lg font-bold text-primary mt-0.5">{openedPercent}%</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-12 w-full rounded-[var(--radius-control)]" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-control)]" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-control)]" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-[var(--radius-control)]">
            No active students are currently enrolled in this batch.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-[var(--radius-control)] pr-1 custom-scrollbar">
            {records.map((rec) => (
              <div
                key={rec.studentId}
                className="p-3 bg-surface hover:bg-surface-hover/40 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{rec.studentName}</p>
                    {rec.studentCode && (
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {rec.studentCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {rec.opened ? (
                      <>
                        <span className="text-secondary font-medium">
                          {rec.accessCount} {rec.accessCount === 1 ? 'view' : 'views'}
                        </span>
                        {rec.lastAccessAt && (
                          <span>· Last opened {formatDate(rec.lastAccessAt, tz)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground/60">Not opened yet</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {rec.opened ? (
                    <Badge variant="success" size="sm" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Opened</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm" className="opacity-60">
                      Unopened
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
