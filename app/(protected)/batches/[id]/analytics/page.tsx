'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

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
  if (pct === null) return 'bg-surface-hover text-muted-foreground ring-border';
  if (pct < 50) return 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-600/20';
  if (pct < 70) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-600/20';
  return 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-600/20';
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
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load analytics data.');
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
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading analytics...</span>
      </div>
    );
  }

  // ── Error ──
  if (errorMsg || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Analytics</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Batch not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batch
        </Link>
      </div>
    );
  }

  const { batchName, overallAverage, perTestBreakdown, chapterWeakSpots } = data;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batchName}</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Analytics</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Batch Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">{batchName} — performance overview across all tests</p>
          </div>
          <Link
            href={`/batches/${batchId}`}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
          >
            &larr; Back to Batch
          </Link>
        </div>

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
                        {new Date(test.testDate).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-foreground">{test.totalMarks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">{test.resultCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-foreground">{fmt(test.average)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 dark:text-green-400 font-semibold">{fmt(test.max, 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 dark:text-red-400 font-semibold">{fmt(test.min, 0)}</td>
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
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> {`<50%`}
              </span>{' '}
              <span className="inline-flex items-center gap-x-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> 50–69%
              </span>{' '}
              <span className="inline-flex items-center gap-x-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> ≥70%
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
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${chapterBadgeClass(chapter.averagePercentage)}`}
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
