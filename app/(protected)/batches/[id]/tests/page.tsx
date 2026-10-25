'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface BatchDetails {
  id: string;
  name: string;
}

interface TestSummary {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE';
  totalMarks: number;
  testDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchTestsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [userRole, setUserRole] = useState<'ADMIN' | 'TEACHER' | 'STUDENT' | null>(null);
  const [myResults, setMyResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role validation & fetch initial data
  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER' && user.role !== 'STUDENT') {
        router.push('/dashboard');
        return;
      }
      setUserRole(user.role as 'ADMIN' | 'TEACHER' | 'STUDENT');
      loadTests(user.role);
    }

    async function loadTests(role: string) {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch batch details
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        // 2. Fetch tests for this batch
        const testsRes = await apiGet<{ success: boolean; data: TestSummary[] }>(`/api/batches/${batchId}/tests`);
        if (testsRes.success) {
          setTests(testsRes.data);

          // 3. Asynchronously load question counts for each test
          testsRes.data.forEach(async (t) => {
            try {
              const testDetail = await apiGet<{ success: boolean; data: { questions: any[] } }>(`/api/tests/${t.id}`);
              if (testDetail.success) {
                setQuestionCounts((prev) => ({
                  ...prev,
                  [t.id]: testDetail.data.questions.length,
                }));
              }
            } catch (err) {
              console.warn(`Failed to fetch details for test ${t.id}`, err);
            }

            // 4. If student, check if they have submitted this test
            if (role === 'STUDENT') {
              try {
                const res = await apiGet<{ success: boolean }>(`/api/tests/${t.id}/my-result`);
                if (res && res.success) {
                  setMyResults((prev) => ({ ...prev, [t.id]: true }));
                }
              } catch (err) {
                setMyResults((prev) => ({ ...prev, [t.id]: false }));
              }
            }
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load tests details');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading tests...</span>
      </div>
    );
  }

  if (errorMsg || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Tests</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Batch not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  const isStaff = userRole === 'ADMIN' || userRole === 'TEACHER';

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch.name}</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Tests</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Exams & Tests</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isStaff
                ? `Manage exams, questions, and grading metrics for ${batch.name}`
                : `View and take exams scheduled for ${batch.name}`}
            </p>
          </div>
          {isStaff && (
            <Link
              href={`/batches/${batchId}/tests/new`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition self-start sm:self-auto"
            >
              Create Test
            </Link>
          )}
        </div>

        {/* Tests Table */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {tests.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-foreground">No tests scheduled</h3>
              <p className="text-xs text-muted-foreground mt-1">There are no exams assigned for this batch yet.</p>
              {isStaff && (
                <div className="mt-6">
                  <Link
                    href={`/batches/${batchId}/tests/new`}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
                  >
                    Create Test
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-hover/50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test Title</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test Date</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Marks</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {tests.map((test) => {
                    let targetUrl = `/batches/${batchId}/tests/${test.id}/manage`;
                    let actionText = 'Manage Questions';

                    if (!isStaff) {
                      const hasSubmitted = myResults[test.id] === true;
                      targetUrl = hasSubmitted
                        ? `/batches/${batchId}/tests/${test.id}/result`
                        : `/batches/${batchId}/tests/${test.id}/take`;
                      actionText = hasSubmitted ? 'View Result' : 'Take Test';
                    }

                    return (
                      <tr key={test.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={targetUrl} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                            {test.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            test.type === 'MCQ'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20'
                              : test.type === 'WRITTEN'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20'
                          }`}>
                            {test.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(test.testDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                          {test.totalMarks} Marks
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {questionCounts[test.id] !== undefined ? (
                            `${questionCounts[test.id]} items`
                          ) : (
                            <span className="text-muted-foreground/60">Loading...</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isStaff && (
                            <Link
                              href={`/batches/${batchId}/tests/${test.id}/results`}
                              className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition mr-2"
                            >
                              {test.type === 'OFFLINE' ? 'Enter Marks' : 'View Results'}
                            </Link>
                          )}
                          {isStaff ? (
                            test.type !== 'OFFLINE' && (
                              <Link
                                href={targetUrl}
                                className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                              >
                                {actionText}
                              </Link>
                            )
                          ) : (
                            <Link
                              href={targetUrl}
                              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                                myResults[test.id] === false
                                  ? 'bg-primary text-primary-foreground border-transparent hover:bg-primary-hover'
                                  : 'bg-surface text-foreground border-border hover:bg-surface-hover'
                              }`}
                            >
                              {actionText}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
