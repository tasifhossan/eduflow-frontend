'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

interface BatchDetails {
  id: string;
  name: string;
}

interface TestSummary {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED';
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
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    let role: 'ADMIN' | 'TEACHER' | 'STUDENT' | null = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN' && payload.role !== 'TEACHER' && payload.role !== 'STUDENT') {
          router.push('/dashboard');
          return;
        }
        role = payload.role;
        setUserRole(role);
      } catch (err) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    async function loadTestsData() {
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

    loadTestsData();
  }, [batchId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
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
        <Link href={`/batches/${batchId}`} className="text-accent hover:underline text-sm font-medium">
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
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Tests</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Exams & Tests</h1>
            <p className="mt-2 text-sm text-gray-500">
              {isStaff
                ? `Manage exams, questions, and grading metrics for ${batch.name}`
                : `View and take exams scheduled for ${batch.name}`}
            </p>
          </div>
          {isStaff && (
            <Link
              href={`/batches/${batchId}/tests/new`}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition self-start sm:self-auto"
            >
              Create Test
            </Link>
          )}
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {tests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
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
              <h3 className="mt-4 text-sm font-semibold text-gray-900">No tests scheduled</h3>
              <p className="text-xs text-gray-400 mt-1">There are no exams assigned for this batch yet.</p>
              {isStaff && (
                <div className="mt-6">
                  <Link
                    href={`/batches/${batchId}/tests/new`}
                    className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    Create Test
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Test Title</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Test Date</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total Marks</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Questions</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                      <tr key={test.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={targetUrl} className="text-sm font-semibold text-accent hover:underline">
                            {test.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            test.type === 'MCQ'
                              ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                              : test.type === 'WRITTEN'
                              ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                              : 'bg-amber-50 text-amber-700 ring-amber-700/10'
                          }`}>
                            {test.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(test.testDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {test.totalMarks} Marks
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {questionCounts[test.id] !== undefined ? (
                            `${questionCounts[test.id]} items`
                          ) : (
                            <span className="text-gray-300">Loading...</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isStaff && (
                            <Link
                              href={`/batches/${batchId}/tests/${test.id}/results`}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition mr-2"
                            >
                              View Results
                            </Link>
                          )}
                          <Link
                            href={targetUrl}
                            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                              !isStaff && myResults[test.id] === false
                                ? 'bg-accent text-white border-transparent hover:bg-indigo-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {actionText}
                          </Link>
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
