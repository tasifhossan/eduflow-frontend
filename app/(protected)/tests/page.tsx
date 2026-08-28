'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Batch {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  subject: { name: string };
}

interface TestSummary {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE';
  totalMarks: number;
  testDate: string;
}

interface BatchWithTests {
  batch: Batch;
  tests: TestSummary[];
  /** STUDENT: keyed by testId, true = submitted */
  myResults?: Record<string, boolean>;
}

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRoleFromCookie(): UserRole | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (['ADMIN', 'TEACHER', 'STUDENT'].includes(payload.role)) {
      return payload.role as UserRole;
    }
    return null;
  } catch (e) {
    console.error('getRoleFromCookie error:', e);
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function typeBadgeClass(type: string) {
  const map: Record<string, string> = {
    MCQ: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    WRITTEN: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    MIXED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  };
  return map[type] ?? 'bg-gray-50 text-gray-700 ring-gray-600/20';
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TestsHubPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [groups, setGroups] = useState<BatchWithTests[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch current user details from backend (which checks the HTTP-only cookie automatically)
        let currentUser: { role: UserRole; id: string } | null = null;
        try {
          const meRes = await apiGet<{ success: boolean; data: { role: string; id: string } }>('/api/auth/me');
          if (meRes?.success && meRes?.data) {
            currentUser = meRes.data as { role: UserRole; id: string };
          }
        } catch (e) {
          console.warn('GET /api/auth/me failed, falling back to local JWT decode.', e);
        }

        // Fallback local JWT decode if /api/auth/me was unavailable
        if (!currentUser) {
          const localRole = getRoleFromCookie();
          if (localRole) {
            // Local token decoding fallback
            const token = getToken();
            const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
            if (payload?.role && payload?.userId) {
              currentUser = { role: payload.role as UserRole, id: payload.userId };
            }
          }
        }

        if (!currentUser) {
          setErrorMsg('Unauthorized: No role detected in user credentials. Please log in again.');
          setLoading(false);
          return;
        }

        const detectedRole = currentUser.role;
        setRole(detectedRole);

        // ── ADMIN / TEACHER: fetch all branch batches ─────────────────────
        if (detectedRole === 'ADMIN' || detectedRole === 'TEACHER') {
          const batchRes = await apiGet<{ success: boolean; data: Batch[] }>('/api/batches');
          if (!batchRes.success) {
            setErrorMsg('Failed to load batches');
            return;
          }
          const batches: Batch[] = batchRes.data;

          // Fetch tests for every batch in parallel
          const settled = await Promise.allSettled(
            batches.map((b) =>
              apiGet<{ success: boolean; data: TestSummary[] }>(
                `/api/batches/${b.id}/tests`,
              ).then((r) => ({ batch: b, tests: r.success ? r.data : [] })),
            ),
          );

          const result: BatchWithTests[] = settled
            .filter((s): s is PromiseFulfilledResult<BatchWithTests> => s.status === 'fulfilled')
            .map((s) => s.value)
            // Only show batches that have at least one test
            .filter((g) => g.tests.length > 0);

          setGroups(result);

        // ── STUDENT: fetch enrolled batches then their tests ──────────────
        } else {
          const userId = currentUser.id;

          if (!userId) {
            setErrorMsg('Could not determine user identity');
            return;
          }

          const enrollRes = await apiGet<{
            success: boolean;
            data: Batch[];
          }>(`/api/students/${userId}/batches`);

          if (!enrollRes.success || !Array.isArray(enrollRes.data)) {
            setErrorMsg('Failed to load enrolled batches');
            return;
          }

          const batches: Batch[] = enrollRes.data;

          // Fetch tests + my-result status per test in parallel
          const settled = await Promise.allSettled(
            batches.map(async (b) => {
              const testsRes = await apiGet<{ success: boolean; data: TestSummary[] }>(
                `/api/batches/${b.id}/tests`,
              );
              const tests: TestSummary[] = testsRes.success ? testsRes.data : [];

              // Check submission status for each test
              const resultChecks = await Promise.allSettled(
                tests.map((t) =>
                  apiGet<{ success: boolean }>(`/api/tests/${t.id}/my-result`).then(() => ({
                    id: t.id,
                    submitted: true,
                  })),
                ),
              );

              const myResults: Record<string, boolean> = {};
              resultChecks.forEach((r, i) => {
                myResults[tests[i].id] = r.status === 'fulfilled';
              });

              return { batch: b, tests, myResults } as BatchWithTests;
            }),
          );

          const result: BatchWithTests[] = settled
            .filter((s): s is PromiseFulfilledResult<BatchWithTests> => s.status === 'fulfilled')
            .map((s) => s.value)
            .filter((g) => g.tests.length > 0);

          setGroups(result);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load tests');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const isStaff = role === 'ADMIN' || role === 'TEACHER';
  const totalTests = groups.reduce((sum, g) => sum + g.tests.length, 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-base text-gray-500 font-medium">Loading tests…</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tests</h1>
            <p className="mt-2 text-sm text-gray-500">
              {isStaff
                ? `All exams across every batch · ${totalTests} test${totalTests !== 1 ? 's' : ''} total`
                : `Your upcoming and past exams across enrolled batches`}
            </p>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!errorMsg && groups.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
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
            <h3 className="mt-4 text-sm font-semibold text-gray-900">No tests found</h3>
            <p className="text-xs text-gray-400 mt-1">
              {isStaff
                ? 'No exams have been created yet. Open a batch to create the first test.'
                : 'No tests have been scheduled in your batches yet.'}
            </p>
            {isStaff && (
              <Link
                href="/batches"
                className="mt-6 inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
              >
                Go to Batches
              </Link>
            )}
          </div>
        )}

        {/* Grouped test lists */}
        {!errorMsg && groups.map(({ batch, tests, myResults }) => (
          <div
            key={batch.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Batch header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-x-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    batch.type === 'ACADEMIC'
                      ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                      : 'bg-amber-50 text-amber-700 ring-amber-700/10'
                  }`}
                >
                  {batch.type}
                </span>
                <Link
                  href={`/batches/${batch.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-accent transition-colors"
                >
                  {batch.name}
                </Link>
                {batch.classLevel && (
                  <span className="text-xs text-gray-400">· {batch.classLevel}</span>
                )}
                <span className="text-xs text-gray-400">· {batch.subject.name}</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span className="text-xs text-gray-400">
                  {tests.length} test{tests.length !== 1 ? 's' : ''}
                </span>
                {isStaff && (
                  <Link
                    href={`/batches/${batch.id}/tests/new`}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                  >
                    + New Test
                  </Link>
                )}
              </div>
            </div>

            {/* Tests table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Marks
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map((test) => {
                    const submitted = myResults?.[test.id] === true;
                    const primaryUrl = isStaff
                      ? `/batches/${batch.id}/tests/${test.id}/manage`
                      : submitted
                      ? `/batches/${batch.id}/tests/${test.id}/result`
                      : `/batches/${batch.id}/tests/${test.id}/take`;
                    const primaryLabel = isStaff
                      ? 'Manage'
                      : submitted
                      ? 'View Result'
                      : 'Take Test';

                    return (
                      <tr key={test.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={primaryUrl}
                            className="text-sm font-semibold text-accent hover:underline"
                          >
                            {test.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${typeBadgeClass(test.type)}`}
                          >
                            {test.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(test.testDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {test.totalMarks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-x-2">
                            {isStaff && (
                              <Link
                                href={`/batches/${batch.id}/tests/${test.id}/results`}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                              >
                                {test.type === 'OFFLINE' ? 'Enter Marks' : 'Results'}
                              </Link>
                            )}
                            {isStaff ? (
                              test.type !== 'OFFLINE' && (
                                <Link
                                  href={primaryUrl}
                                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                                >
                                  {primaryLabel}
                                </Link>
                              )
                            ) : (
                              <Link
                                href={primaryUrl}
                                className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                                  !submitted
                                    ? 'bg-accent text-white border-transparent hover:bg-indigo-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {primaryLabel}
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
