'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Globe,
  ArrowRight,
  Info,
  Clock,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { RequireRole } from '@/components/providers/require-role';
import { PageHeader } from '@/components/dashboard/page-header';
import { SectionCard } from '@/components/dashboard/section-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet } from '@/lib/api';

interface CmsSummaryData {
  blog: { draft: number; scheduled: number; published: number; total: number };
  faq: { draft: number; scheduled: number; published: number; total: number };
  testimonials: { draft: number; scheduled: number; published: number; total: number };
  reviews: { visible: number; hidden: number; total: number };
  teachers: { publicCount: number; totalCount: number };
}

export default function WebsiteHubPage() {
  const [data, setData] = React.useState<CmsSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSummary = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: CmsSummaryData }>('/api/cms/summary');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Failed to load website content summary.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiGet<{ success: boolean; data: CmsSummaryData }>('/api/cms/summary')
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError('Failed to load website content summary.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to server.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Website Content Hub"
          description="Manage public website content: blog articles, admissions FAQ, testimonials, faculty profiles, and review moderation."
          icon={<Globe className="h-6 w-6 text-primary" aria-hidden="true" />}
        />

        {/* Caching Advisory Note */}
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 text-xs sm:text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold text-foreground">Cache Notice: </span>
            Changes can take up to 5 minutes to appear on the website due to performance caching.
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Failed to load website summary"
            message={error}
            onRetry={fetchSummary}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-[var(--radius-card)] border border-border bg-surface space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-9 w-full rounded-[var(--radius-control)]" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. Blog Card */}
              <SectionCard
                title="Blog Articles"
                description="Articles & admissions announcements"
                className="flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.blog.published}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Published</div>
                    </div>
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.blog.scheduled}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Scheduled</div>
                    </div>
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.blog.draft}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Draft</div>
                    </div>
                  </div>

                  {data.blog.published === 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-control)] bg-status-warning-bg/60 border border-status-warning-border text-status-warning-text text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>No published blog posts yet: this section is hidden on your website.</span>
                    </div>
                  )}

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/website/blog" className="flex items-center justify-center gap-1.5">
                      <span>Manage Blog</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </SectionCard>

              {/* 2. FAQ Card */}
              <SectionCard
                title="Admissions FAQ"
                description="Frequently asked student questions"
                className="flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.faq.published}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Published</div>
                    </div>
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.faq.draft}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Draft</div>
                    </div>
                  </div>

                  {data.faq.published === 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-control)] bg-status-warning-bg/60 border border-status-warning-border text-status-warning-text text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>No published FAQ yet: this section is hidden on your website.</span>
                    </div>
                  )}

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/website/faq" className="flex items-center justify-center gap-1.5">
                      <span>Manage FAQ</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </SectionCard>

              {/* 3. Testimonials Card */}
              <SectionCard
                title="Student Testimonials"
                description="Verified quotes & parent feedback"
                className="flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.testimonials.published}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Published</div>
                    </div>
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.testimonials.draft}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Draft</div>
                    </div>
                  </div>

                  {data.testimonials.published === 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-control)] bg-status-warning-bg/60 border border-status-warning-border text-status-warning-text text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>No published testimonials yet: this section is hidden on your website.</span>
                    </div>
                  )}

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/website/testimonials" className="flex items-center justify-center gap-1.5">
                      <span>Manage Testimonials</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </SectionCard>

              {/* 4. Faculty Profiles Card */}
              <SectionCard
                title="Faculty Profiles"
                description="Public teacher bios & designations"
                className="flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="p-3 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {data.teachers.publicCount} / {data.teachers.totalCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Teachers showing publicly
                      </div>
                    </div>
                    <UserCheck className="h-8 w-8 text-primary/70 shrink-0" aria-hidden="true" />
                  </div>

                  {data.teachers.publicCount === 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-control)] bg-status-warning-bg/60 border border-status-warning-border text-status-warning-text text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>No public teacher profiles yet: faculty section is hidden on your website.</span>
                    </div>
                  )}

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/website/teachers" className="flex items-center justify-center gap-1.5">
                      <span>Manage Teachers</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </SectionCard>

              {/* 5. Reviews Moderation Card */}
              <SectionCard
                title="Reviews Moderation"
                description="Student course ratings & visibility"
                className="flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.reviews.visible}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Visible</div>
                    </div>
                    <div className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {data.reviews.hidden}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Hidden</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-control)] bg-surface-hover/40 border border-border text-xs text-muted-foreground">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Hidden reviews are excluded from course ratings and avg score.</span>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/website/reviews" className="flex items-center justify-center gap-1.5">
                      <span>Moderate Reviews</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null}
      </div>
    </RequireRole>
  );
}
