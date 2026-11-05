'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PerTestBreakdown {
  testId: string;
  testName: string;
  testDate: string;
  totalMarks: number;
  resultCount: number;
  average: number | null;
  max: number | null;
  min: number | null;
}

interface ChapterWeakSpot {
  chapterId: string;
  chapterName: string;
  averageScore: number | null;
  averagePercentage: number | null;
  resultCount: number;
}

interface AnalyticsData {
  batchId: string;
  batchName: string;
  overallAverage: number | null;
  perTestBreakdown: PerTestBreakdown[];
  chapterWeakSpots: ChapterWeakSpot[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Red / amber / green by percentage band */
function chapterBadgeClass(pct: number | null): string {
  if (pct === null) return 'bg-muted text-muted-foreground border-border';
  if (pct < 50) return 'bg-status-danger-bg text-status-danger-text border-status-danger-border';
  if (pct < 70) return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
  return 'bg-status-success-bg text-status-success-text border-status-success-border';
}

function fmt(n: number | null, decimals = 1): string {
  if (n === null) return '—';
  return n.toFixed(decimals);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BatchAnalyticsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        router.push('/dashboard');
        return;
      }
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiGet<{ success: boolean; data: AnalyticsData }>(
          `/api/batches/${batchId}/analytics`
        );
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setErrorMsg('Failed to load analytics data.');
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [batchId, router]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading analytics...</span>
      </div>
    );
  }

  // ── Error ──
  if (errorMsg || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <ErrorState
          title="Error Loading Analytics"
          message={errorMsg || 'Batch not found or access denied.'}
          onRetry={() => window.location.reload()}
        />
        <Button asChild variant="outline" size="sm">
          <Link href={`/batches/${batchId}`}>
            &larr; Back to batch
          </Link>
        </Button>
      </div>
    );
  }

  const { batchName, overallAverage, perTestBreakdown, chapterWeakSpots } = data;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Batch Analytics"
          description={`${batchName} — performance overview across all tests`}
          breadcrumbs={[
            { label: 'Batches', href: '/batches' },
            { label: batchName, href: `/batches/${batchId}` },
            { label: 'Analytics' },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={`/batches/${batchId}`}>
                &larr; Back to Batch
              </Link>
            </Button>
          }
        />

        {/* Overall Average Card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 flex items-center gap-x-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-extrabold text-xl">
              {overallAverage !== null ? `${overallAverage}` : '—'}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Batch Average</p>
            <p className="text-2xl font-extrabold text-foreground">
              {overallAverage !== null ? overallAverage : 'No data yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Mean score across all submitted results in this batch</p>
          </div>
        </div>

        {/* Per-Test Breakdown */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Per-Test Breakdown</h2>
            <p className="text-xs text-muted-foreground">Average, max, and min score for each test</p>
          </div>

          {perTestBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-10 text-center">
              No tests found in this batch.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-hover/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Marks</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submissions</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {perTestBreakdown.map((test) => (
                    <tr key={test.testId} className="hover:bg-surface-hover/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">{test.testName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(test.testDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-foreground">{test.totalMarks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">{test.resultCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-foreground">{fmt(test.average)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-status-success font-semibold">{fmt(test.max, 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-status-danger font-semibold">{fmt(test.min, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chapter Weak-Spot Breakdown */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Chapter Weak-Spot Analysis</h2>
            <p className="text-xs text-muted-foreground">
              Chapters sorted weakest-first by average score percentage —{' '}
              <span className="inline-flex items-center gap-x-1">
                <span className="inline-block w-2 h-2 rounded-full bg-status-danger" /> {`<50%`}
              </span>{' '}
              <span className="inline-flex items-center gap-x-1">
                <span className="inline-block w-2 h-2 rounded-full bg-status-warning" /> 50–69%
              </span>{' '}
              <span className="inline-flex items-center gap-x-1">
                <span className="inline-block w-2 h-2 rounded-full bg-status-success" /> ≥70%
              </span>
            </p>
          </div>

          {chapterWeakSpots.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-10 text-center">
              No chapter-tagged tests found. Tag tests with a chapter to see weak-spot analysis.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-hover/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chapter</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg %</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strength</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {chapterWeakSpots.map((chapter, idx) => (
                    <tr key={chapter.chapterId} className="hover:bg-surface-hover/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground">#{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">{chapter.chapterName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-foreground">{fmt(chapter.averageScore)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-foreground">
                        {chapter.averagePercentage !== null ? `${chapter.averagePercentage}%` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">{chapter.resultCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${chapterBadgeClass(chapter.averagePercentage)}`}
                        >
                          {chapter.averagePercentage === null
                            ? 'No data'
                            : chapter.averagePercentage < 50
                            ? 'Weak'
                            : chapter.averagePercentage < 70
                            ? 'Average'
                            : 'Strong'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
