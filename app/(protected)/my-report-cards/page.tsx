'use client';

import * as React from 'react';
import {
  Award,
  Calendar,
  Eye,
  Printer,
  X,
  Users,
  Loader2,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PrintableReportCard } from '@/components/report-card/printable-report-card';
import type { StudentFullReportCard } from '@/lib/types/report-card';

interface PublishedPeriod {
  id: string;
  batchId: string;
  batchName: string;
  label: string;
  from: string;
  to: string;
  publishedAt: string;
  createdAt: string;
}

interface LinkedStudent {
  id: string;
  name: string;
  studentCode?: string | null;
}

interface MyReportCardsApiResponse {
  periods: PublishedPeriod[];
  linkedChildren?: LinkedStudent[];
  currentStudentId?: string;
}

export default function MyReportCardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { center } = useCenter();
  const isGuardian = user?.role === 'GUARDIAN';

  // Guardian children state
  const [children, setChildren] = React.useState<LinkedStudent[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');
  const [isLoadingChildren, setIsLoadingChildren] = React.useState(false);

  // Report cards state
  const [periods, setPeriods] = React.useState<PublishedPeriod[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Card view & print modal state
  const [activeCard, setActiveCard] = React.useState<StudentFullReportCard | null>(null);
  const [loadingCardId, setLoadingCardId] = React.useState<string | null>(null);

  // Load guardian children if guardian
  React.useEffect(() => {
    if (!isGuardian) return;

    async function loadChildren() {
      setIsLoadingChildren(true);
      try {
        const res = await apiGet<{ success: boolean; data: LinkedStudent[] }>('/api/guardians/my-students');
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setChildren(res.data);
          setSelectedChildId(res.data[0].id);
        } else {
          setChildren([]);
        }
      } catch {
        setError('Failed to load linked students');
      } finally {
        setIsLoadingChildren(false);
      }
    }

    loadChildren();
  }, [isGuardian]);

  // Load published report cards
  React.useEffect(() => {
    let ignore = false;

    async function loadCards() {
      if (authLoading || !user) {
        return;
      }
      if (user.role !== 'STUDENT' && user.role !== 'GUARDIAN') {
        setIsLoading(false);
        return;
      }
      if (isGuardian && !selectedChildId && !isLoadingChildren) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        let endpoint = '/api/my/report-cards';
        if (isGuardian && selectedChildId) {
          endpoint += `?studentId=${selectedChildId}`;
        }

        const res = await apiGet<{
          success: boolean;
          data: PublishedPeriod[] | MyReportCardsApiResponse;
        }>(endpoint);
        if (!ignore) {
          const raw = res?.data ?? res;
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as MyReportCardsApiResponse)?.periods)
            ? (raw as MyReportCardsApiResponse).periods
            : Array.isArray((res as any)?.periods)
            ? (res as any).periods
            : [];

          setPeriods(list);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Unable to load report cards');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      ignore = true;
    };
  }, [user, authLoading, isGuardian, selectedChildId, isLoadingChildren, reloadKey]);

  // View full report card
  const handleViewCard = async (periodId: string) => {
    setLoadingCardId(periodId);
    try {
      let endpoint = `/api/my/report-cards/${periodId}`;
      if (isGuardian && selectedChildId) {
        endpoint += `?studentId=${selectedChildId}`;
      }

      const res = await apiGet<{ success: boolean; data: StudentFullReportCard }>(endpoint);
      if (res?.success && res.data) {
        setActiveCard(res.data);
      } else {
        setError('Failed to open report card details');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load report card');
    } finally {
      setLoadingCardId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Report Cards"
        description="View and print official academic performance summaries and term report cards."
      />

      {/* Guardian Child Selector */}
      {isGuardian && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">Select Student:</span>
          </div>
          {isLoadingChildren ? (
            <Skeleton className="h-9 w-48" />
          ) : children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked children found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface text-foreground border-border hover:bg-surface-hover'
                    }`}
                  >
                    {child.name} {child.studentCode ? `(${child.studentCode})` : ''}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <ErrorState
          title="Could not load report cards"
          message={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : periods.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6 stroke-[1.5]" />}
          title="No report cards published yet"
          description="When your instructors complete evaluations and publish term report cards, they will appear here for review and printing."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {periods.map((period) => (
            <div
              key={period.id}
              className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {period.batchName}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Published {formatDate(period.publishedAt)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground mt-3 tracking-tight">
                  {period.label}
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  Evaluation span: {formatDate(period.from)} – {formatDate(period.to)}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleViewCard(period.id)}
                  disabled={loadingCardId === period.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loadingCardId === period.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  View & Print Card
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View & Print Modal */}
      {activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  {activeCard.period.label} – {activeCard.student.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCard(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-background/50">
              <PrintableReportCard card={activeCard} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
