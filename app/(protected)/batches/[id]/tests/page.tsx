'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiDelete, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDateTime } from '@/lib/tz';
import { useCenter } from '@/components/providers/center-provider';

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
  archivedAt?: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchTestsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);
  const { center } = useCenter();
  const centerTz = center?.timezone || 'Asia/Dhaka';

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [archivedTests, setArchivedTests] = useState<TestSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<'active' | 'archived'>('active');
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [userRole, setUserRole] = useState<'ADMIN' | 'TEACHER' | 'STUDENT' | null>(null);
  const [myResults, setMyResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Archive modal states
  const [testToArchive, setTestToArchive] = useState<TestSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const isStaff = userRole === 'ADMIN' || userRole === 'TEACHER';

  const loadTests = useCallback(async (role: string) => {
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

        // 3. Load question counts asynchronously
        testsRes.data.forEach(async (t) => {
          try {
            const testDetail = await apiGet<{ success: boolean; data: { questions: unknown[] } }>(`/api/tests/${t.id}`);
            if (testDetail.success) {
              setQuestionCounts((prev) => ({
                ...prev,
                [t.id]: testDetail.data.questions.length,
              }));
            }
          } catch {
            // Silently ignore
          }

          // 4. If student, check if they submitted
          if (role === 'STUDENT') {
            try {
              const res = await apiGet<{ success: boolean }>(`/api/tests/${t.id}/my-result`);
              if (res && res.success) {
                setMyResults((prev) => ({ ...prev, [t.id]: true }));
              }
            } catch {
              setMyResults((prev) => ({ ...prev, [t.id]: false }));
            }
          }
        });
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to load tests details');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

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

    init();
  }, [batchId, router, loadTests]);

  const handleArchiveConfirm = async () => {
    if (!testToArchive || isArchiving) return;

    setIsArchiving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiDelete<{ success: boolean; message?: string; data?: { archived?: boolean } }>(
        `/api/tests/${testToArchive.id}`
      );

      if (res.success) {
        setSuccessMsg(`Test "${testToArchive.title}" has been archived. Past results and history remain safely preserved.`);
        setArchivedTests((prev) => [...prev, { ...testToArchive, archivedAt: new Date().toISOString() }]);
        setTests((prev) => prev.filter((t) => t.id !== testToArchive.id));
        setTestToArchive(null);
      } else {
        setErrorMsg(res.message || 'Failed to archive test');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred while archiving the test');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (testId: string) => {
    setIsRestoring(testId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiPost<{ success: boolean; message?: string }>(`/api/tests/${testId}/restore`, {});

      if (res.success) {
        setSuccessMsg('Test has been restored to active status!');
        const restored = archivedTests.find((t) => t.id === testId);
        if (restored) {
          setArchivedTests((prev) => prev.filter((t) => t.id !== testId));
          setTests((prev) => [...prev, { ...restored, archivedAt: null }]);
        }
        if (userRole) {
          await loadTests(userRole);
        }
      } else {
        setErrorMsg(res.message || 'Failed to restore test');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred while restoring the test');
    } finally {
      setIsRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading tests...</span>
      </div>
    );
  }

  if (errorMsg && !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
          <h3 className="text-sm font-semibold text-status-danger-text">Error Loading Tests</h3>
          <p className="text-sm text-status-danger-text mt-1">{errorMsg || 'Batch not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  const displayedTests = activeFilter === 'active' ? tests : archivedTests;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch?.name}</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Tests</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Exams & Tests</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isStaff
                ? `Manage exams, questions, and grading metrics for ${batch?.name}`
                : `View and take exams scheduled for ${batch?.name}`}
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

        {/* Global Notifications */}
        {successMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-success-bg p-4 border border-status-success-border">
            <p className="text-sm text-status-success-text font-medium">✓ {successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
            <p className="text-sm text-status-danger-text font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Staff Filter Tabs (Active vs Archived) */}
        {isStaff && (
          <div className="flex border-b border-border gap-x-2">
            <button
              onClick={() => setActiveFilter('active')}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-x-1.5 ${activeFilter === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Active Tests
              <Badge variant="neutral" size="sm">
                {tests.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-x-1.5 ${activeFilter === 'archived'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Archived Tests
              {archivedTests.length > 0 && (
                <Badge variant="warning" size="sm">
                  {archivedTests.length}
                </Badge>
              )}
            </button>
          </div>
        )}

        {/* Tests Table */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {displayedTests.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <h3 className="text-sm font-semibold text-foreground">
                {activeFilter === 'active' ? 'No active tests scheduled' : 'No archived tests found'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {activeFilter === 'active'
                  ? 'There are no active exams assigned for this batch.'
                  : 'No exams have been archived for this batch.'}
              </p>
              {isStaff && activeFilter === 'active' && (
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
                  {displayedTests.map((test) => {
                    let targetUrl = `/batches/${batchId}/tests/${test.id}/manage`;
                    let actionText = 'Manage';

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
                          {activeFilter === 'active' ? (
                            <Link href={targetUrl} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                              {test.title}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {test.title} (Archived)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <Badge
                            variant={
                              test.type === 'MCQ'
                                ? 'primary'
                                : test.type === 'WRITTEN'
                                  ? 'secondary'
                                  : 'accent'
                            }
                            size="sm"
                          >
                            {test.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(test.testDate, centerTz)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                          {test.totalMarks} Marks
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {questionCounts[test.id] !== undefined ? (
                            `${questionCounts[test.id]} items`
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                          {isStaff ? (
                            activeFilter === 'active' ? (
                              <>
                                <Link
                                  href={`/batches/${batchId}/tests/${test.id}/results`}
                                  className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                                >
                                  {test.type === 'OFFLINE' ? 'Marks' : 'Results'}
                                </Link>
                                {test.type !== 'OFFLINE' && (
                                  <Link
                                    href={targetUrl}
                                    className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                                  >
                                    {actionText}
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setTestToArchive(test)}
                                  className="inline-flex items-center rounded-md border border-status-danger-border bg-status-danger-bg px-2.5 py-1 text-xs font-semibold text-status-danger-text hover:opacity-80 transition"
                                >
                                  Archive
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isRestoring === test.id}
                                onClick={() => handleRestore(test.id)}
                                className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                              >
                                {isRestoring === test.id ? 'Restoring...' : 'Restore'}
                              </button>
                            )
                          ) : (
                            <Link
                              href={targetUrl}
                              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${myResults[test.id] === false
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

      {/* Archive Confirmation Modal */}
      {testToArchive && (
        <Modal
          isOpen={true}
          onClose={() => setTestToArchive(null)}
          title={`Archive "${testToArchive.title}"`}
          description="Soft-archive this exam cohort. History is fully preserved."
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Are you sure you want to archive this test?
            </p>
            <div className="rounded-[var(--radius-card)] bg-surface-hover/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p>• <strong>Historical safety:</strong> All student attempts, submitted answers, and calculated marks will remain stored in the database.</p>
              <p>• <strong>Student visibility:</strong> This exam will immediately vanish from active student dashboards.</p>
              <p>• <strong>Restoration:</strong> Administrators can restore this test at any time from the &ldquo;Archived Tests&rdquo; tab.</p>
            </div>
            <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setTestToArchive(null)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleArchiveConfirm}
                className="rounded-lg bg-status-danger-bg border border-status-danger-border px-4 py-2 text-xs font-semibold text-status-danger-text hover:opacity-80 disabled:opacity-50 transition"
              >
                {isArchiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
