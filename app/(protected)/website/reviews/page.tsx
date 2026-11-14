'use client';

import * as React from 'react';
import {
  Star,
  Eye,
  EyeOff,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { useCenter } from '@/components/providers/center-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate } from '@/lib/format';
import { apiGet, apiPatch } from '@/lib/api';

interface ReviewCmsRecord {
  [key: string]: unknown;
  id: string;
  rating: number;
  comment?: string | null;
  studentName?: string | null;
  batch?: { id: string; name: string } | null;
  isHidden: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  hiddenBy?: { id: string; name: string } | null;
  createdAt: string;
}

interface ReviewListResponse {
  reviews: ReviewCmsRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function WebsiteReviewsPage() {
  const { center } = useCenter();

  const [reviews, setReviews] = React.useState<ReviewCmsRecord[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [hiddenFilter, setHiddenFilter] = React.useState<string>('all');
  const [ratingFilter, setRatingFilter] = React.useState<string>('all');

  // Hide / Unhide Modal
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedReview, setSelectedReview] = React.useState<ReviewCmsRecord | null>(null);
  const [reason, setReason] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const loadReviews = React.useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageToLoad));
        params.set('limit', '10');
        if (hiddenFilter === 'hidden') params.set('hidden', 'true');
        if (hiddenFilter === 'visible') params.set('hidden', 'false');
        if (ratingFilter !== 'all') params.set('rating', ratingFilter);

        const res = await apiGet<{ success: boolean; data: ReviewListResponse }>(
          `/api/cms/reviews?${params.toString()}`
        );

        if (res.success && res.data) {
          setReviews(res.data.reviews);
          setPagination(res.data.pagination);
        } else {
          setError('Failed to load reviews.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading reviews.');
      } finally {
        setLoading(false);
      }
    },
    [hiddenFilter, ratingFilter]
  );

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '10');
    if (hiddenFilter === 'hidden') params.set('hidden', 'true');
    if (hiddenFilter === 'visible') params.set('hidden', 'false');
    if (ratingFilter !== 'all') params.set('rating', ratingFilter);

    apiGet<{ success: boolean; data: ReviewListResponse }>(
      `/api/cms/reviews?${params.toString()}`
    )
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setReviews(res.data.reviews);
          setPagination(res.data.pagination);
        } else {
          setError('Failed to load reviews.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error loading reviews.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hiddenFilter, ratingFilter]);

  const handleOpenDialog = (r: ReviewCmsRecord) => {
    setSelectedReview(r);
    setReason(r.hiddenReason || '');
    setModalOpen(true);
  };

  const handleToggleVisibility = async () => {
    if (!selectedReview) return;
    setIsUpdating(true);
    try {
      const targetIsHidden = !selectedReview.isHidden;
      const res = await apiPatch<{ success: boolean; data: ReviewCmsRecord }>(
        `/api/cms/reviews/${selectedReview.id}/visibility`,
        {
          isHidden: targetIsHidden,
          reason: targetIsHidden ? reason.trim() || undefined : undefined,
        }
      );

      if (res.success) {
        toast.success(
          targetIsHidden
            ? 'Review hidden from public website and ratings.'
            : 'Review restored to public website.'
        );
        setModalOpen(false);
        loadReviews(pagination.page);
      } else {
        toast.error('Failed to update review visibility.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<ReviewCmsRecord>[] = [
    {
      key: 'batch',
      header: 'Batch',
      render: (r) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-xs sm:text-sm text-foreground block">
            {r.batch?.name || 'General Course'}
          </span>
          <span className="text-xs text-muted-foreground block">
            Student: {r.studentName || 'Anonymous'}
          </span>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <div className="flex items-center gap-1 text-warning">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < r.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs font-mono text-foreground font-semibold ml-1">
            {r.rating}.0
          </span>
        </div>
      ),
    },
    {
      key: 'comment',
      header: 'Review Comment',
      render: (r) => (
        <div className="max-w-md space-y-1">
          <p className="text-xs sm:text-sm text-foreground leading-relaxed line-clamp-3">
            {r.comment ? `"${r.comment}"` : <span className="italic text-muted-foreground">No comment text</span>}
          </p>
          {r.isHidden && r.hiddenReason && (
            <p className="text-[11px] text-danger font-medium flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              Reason: {r.hiddenReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.isHidden ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-danger-bg text-status-danger-text border border-status-danger-border"
            title={r.hiddenReason ? `Hidden: ${r.hiddenReason}` : 'Hidden from public'}
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            Hidden
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-success-bg text-status-success-text border border-status-success-border">
            <Eye className="h-3 w-3" aria-hidden="true" />
            Visible
          </span>
        ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(r.createdAt, center.timezone, center.defaultLocale)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r) => (
        <Button
          type="button"
          variant={r.isHidden ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => handleOpenDialog(r)}
          className="h-8 px-2.5 text-xs gap-1"
        >
          {r.isHidden ? (
            <>
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Unhide
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Hide
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Student Reviews Moderation"
          description="Moderate reviews submitted by students. Hiding a review removes it from the public website and excludes it from the course's average rating calculation."
          icon={<Star className="h-6 w-6 text-primary" aria-hidden="true" />}
        />

        {/* Rating Advisory Banner */}
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 text-xs sm:text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold text-foreground">Rating Calculation Rule: </span>
            Hidden reviews no longer count towards average rating scores or review totals on batch detail pages, course cards, and public highlights.
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-surface p-4 rounded-[var(--radius-card)] border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <select
              value={hiddenFilter}
              onChange={(e) => setHiddenFilter(e.target.value)}
              aria-label="Filter by visibility status"
              className="h-9 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Reviews</option>
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              aria-label="Filter by star rating"
              className="h-9 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Table & Content */}
        {error ? (
          <ErrorState
            title="Failed to load reviews"
            message={error}
            onRetry={() => loadReviews(pagination.page)}
          />
        ) : !loading && reviews.length === 0 ? (
          <EmptyState
            title="No reviews found"
            description="Reviews submitted by enrolled students upon batch completion will appear here for moderation."
          />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={reviews}
              isLoading={loading}
            />

            {pagination.totalPages > 1 && (
              <div className="pt-2">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => loadReviews(p)}
                />
              </div>
            )}
          </div>
        )}

        {/* Hide / Unhide Modal with Reason */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedReview?.isHidden ? 'Restore Review to Public?' : 'Hide Review from Public?'}
          description={
            selectedReview?.isHidden
              ? 'This review will become visible on the public website and will be included in the batch average score calculation.'
              : 'This review will be hidden from the public batch catalog and excluded from average rating scores.'
          }
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={selectedReview?.isHidden ? 'primary' : 'danger'}
                isLoading={isUpdating}
                onClick={handleToggleVisibility}
              >
                {selectedReview?.isHidden ? 'Confirm Unhide' : 'Confirm Hide'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-xs space-y-1">
              <div className="font-semibold text-foreground">
                Batch: {selectedReview?.batch?.name} ({selectedReview?.rating} Stars)
              </div>
              <p className="italic text-muted-foreground">
                &ldquo;{selectedReview?.comment || 'No comment text'}&rdquo;
              </p>
            </div>

            {!selectedReview?.isHidden && (
              <FormField
                label="Reason for Hiding (Optional)"
                hint="Internal moderation note (max 200 characters)"
              >
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Inappropriate language / off-topic spam"
                />
              </FormField>
            )}
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
