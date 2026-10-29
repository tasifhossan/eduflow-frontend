'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useCenter } from '@/components/providers/center-provider';
import { formatDateTime, getTimezoneDisplay } from '@/lib/tz';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface BatchDetails {
  id: string;
  name: string;
}

interface QuestionDetails {
  id: string;
  type: 'MCQ' | 'WRITTEN';
  text: string;
  marks: number;
}

interface StudentAnswer {
  id: string;
  questionId: string;
  selectedOptionId?: string | null;
  writtenAnswerText?: string | null;
  marksAwarded?: number | null;
  question: QuestionDetails;
}

interface StudentDetails {
  id: string;
  name: string;
  email: string;
  studentAnswers: StudentAnswer[];
}

interface ResultSummary {
  id: string;
  studentId: string;
  totalMarksObtained: number;
  rank?: number | null;
  submittedAt: string;
  student: StudentDetails;
}

interface TestDetails {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE';
  totalMarks: number;
  negativeMarkingValue: number;
  durationMinutes?: number | null;
  windowEndsAt?: string | null;
  testDate: string;
  isClosed?: boolean;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface AttemptItem {
  id: string;
  studentId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string | null;
  extendedMinutes: number;
  extendReason?: string | null;
  extendedById?: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
}

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default function TestResultsDashboardPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: batchId, testId } = use(params);
  const { center } = useCenter();
  const centerTz = center?.timezone || 'Asia/Dhaka';

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [test, setTest] = useState<TestDetails | null>(null);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab
  const initialTab = searchParams.get('tab') === 'attempts' ? 'attempts' : 'leaderboard';
  const [activeTab, setActiveTab] = useState<'attempts' | 'leaderboard' | 'grading' | 'manual'>(initialTab);

  // Extend Modal States
  const [extendTargetAttempt, setExtendTargetAttempt] = useState<AttemptItem | null>(null);
  const [extendMinutes, setExtendMinutes] = useState('15');
  const [extendReason, setExtendReason] = useState('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  // Finalize Modal States
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Input states for grading
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({});
  const [gradingErrors, setGradingErrors] = useState<Record<string, string>>({});
  const [gradingSubmitting, setGradingSubmitting] = useState<Record<string, boolean>>({});

  // Manual score entry states
  const [manualMarks, setManualMarks] = useState<Record<string, string>>({});
  const [savingManual, setSavingManual] = useState(false);

  // Fetch attempts callback
  const fetchAttempts = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: { attempts: AttemptItem[] } }>(
        `/api/tests/${testId}/attempts`
      );
      if (res && res.success && Array.isArray(res.data?.attempts)) {
        setAttempts(res.data.attempts);
      }
    } catch {
      // Background poll failure silently swallowed
    }
  }, [testId]);

  // Fetch results callback
  const fetchResults = useCallback(async () => {
    try {
      const resultsRes = await apiGet<{ success: boolean; data: ResultSummary[] }>(`/api/tests/${testId}/results`);
      if (resultsRes.success) {
        setResults(resultsRes.data);
        const initialManual: Record<string, string> = {};
        resultsRes.data.forEach((r) => {
          initialManual[r.studentId] = String(r.totalMarksObtained);
        });
        setManualMarks(initialManual);
      }
    } catch {
      // Handled in caller
    }
  }, [testId]);

  // Role validation & fetch initial data
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
      loadInitialData();
    }

    async function loadInitialData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        const testRes = await apiGet<{ success: boolean; data: TestDetails }>(`/api/tests/${testId}`);
        if (testRes.success) {
          setTest(testRes.data);
          if (testRes.data.type === 'OFFLINE' && !searchParams.get('tab')) {
            setActiveTab('manual');
          }
        }

        const studentsRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`)
          .catch(() => ({ success: false, data: [] }));
        if (studentsRes.success && Array.isArray(studentsRes.data)) {
          setBatchStudents(studentsRes.data);
        }

        await Promise.all([fetchResults(), fetchAttempts()]);
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Failed to load test results data');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, testId, router, searchParams, fetchResults, fetchAttempts]);

  // 30s auto-refresh for attempts while page is visible
  useEffect(() => {
    if (activeTab !== 'attempts') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAttempts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, fetchAttempts]);

  // Handle extension
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTargetAttempt || extendSubmitting) return;

    const mins = Number(extendMinutes);
    if (isNaN(mins) || mins < 1 || mins > 60) {
      setExtendError('Additional minutes must be between 1 and 60');
      return;
    }

    if (!extendReason.trim()) {
      setExtendError('A justification reason is required for auditing');
      return;
    }

    setExtendSubmitting(true);
    setExtendError(null);

    try {
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/api/tests/${testId}/attempts/${extendTargetAttempt.id}/extend`,
        {
          additionalMinutes: mins,
          reason: extendReason.trim(),
        }
      );

      if (res.success) {
        setSuccessMsg(`Extended time for ${extendTargetAttempt.student.name} by ${mins} minutes`);
        setExtendTargetAttempt(null);
        setExtendReason('');
        await fetchAttempts();
      } else {
        setExtendError(res.message || 'Failed to extend time');
      }
    } catch (err: unknown) {
      setExtendError((err as Error).message || 'An error occurred while extending time');
    } finally {
      setExtendSubmitting(false);
    }
  };

  // Handle finalize exam
  const handleFinalizeExam = async () => {
    setFinalizing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: { finalizedAttempts: number; ranksComputed: number };
      }>(`/api/tests/${testId}/finalize`, {});

      if (res.success) {
        setIsFinalizeModalOpen(false);
        const count = res.data?.finalizedAttempts ?? 0;
        const ranks = res.data?.ranksComputed ?? 0;
        setSuccessMsg(
          `Exam finalized successfully! ${count} attempt(s) closed, ${ranks} competition ranking(s) recomputed.`
        );
        await Promise.all([fetchAttempts(), fetchResults()]);
      } else {
        setErrorMsg(res.message || 'Failed to finalize exam');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred during exam finalization');
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveManualMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payloadResults = Object.entries(manualMarks)
        .map(([studentId, marksStr]) => ({
          studentId,
          marksObtained: Number(marksStr),
        }))
        .filter((item) => !isNaN(item.marksObtained));

      const res = await apiPost(`/api/tests/${testId}/manual-results`, {
        results: payloadResults,
      });

      if (res && res.success) {
        setSuccessMsg('Manual marks saved successfully!');
        await fetchResults();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to save manual test scores');
    } finally {
      setSavingManual(false);
    }
  };

  const handleSaveGrade = async (ansId: string, maxMarks: number) => {
    const rawScore = gradingScores[ansId];
    if (rawScore === undefined || rawScore.trim() === '') {
      setGradingErrors((prev) => ({ ...prev, [ansId]: 'Please enter a score' }));
      return;
    }

    const scoreNum = Number(rawScore);
    if (isNaN(scoreNum) || scoreNum < 0) {
      setGradingErrors((prev) => ({ ...prev, [ansId]: 'Must be a positive number' }));
      return;
    }

    if (scoreNum > maxMarks) {
      setGradingErrors((prev) => ({
        ...prev,
        [ansId]: `Cannot exceed maximum question marks (${maxMarks})`,
      }));
      return;
    }

    setGradingErrors((prev) => ({ ...prev, [ansId]: '' }));
    setGradingSubmitting((prev) => ({ ...prev, [ansId]: true }));
    setSuccessMsg(null);

    try {
      const response = await apiPatch<{ success: boolean; message?: string }>(
        `/api/answers/${ansId}/grade`,
        { marksAwarded: scoreNum }
      );

      if (response && response.success) {
        setSuccessMsg('Written response graded successfully!');
        await fetchResults();
        setGradingScores((prev) => {
          const next = { ...prev };
          delete next[ansId];
          return next;
        });
      } else {
        setGradingErrors((prev) => ({
          ...prev,
          [ansId]: response.message || 'Failed to submit grade',
        }));
      }
    } catch (err: unknown) {
      setGradingErrors((prev) => ({
        ...prev,
        [ansId]: (err as Error).message || 'Error occurred while grading',
      }));
    } finally {
      setGradingSubmitting((prev) => ({ ...prev, [ansId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading test data...</span>
      </div>
    );
  }

  if (errorMsg || !test || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
          <h3 className="text-sm font-semibold text-status-danger-text">Error Loading Results</h3>
          <p className="text-sm text-status-danger-text mt-1">{errorMsg || 'Parameters not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to tests list
        </Link>
      </div>
    );
  }

  const isWrittenExam = test.type === 'WRITTEN' || test.type === 'MIXED';

  // Compile list of students with ungraded written answers
  const ungradedSubmissions: {
    studentName: string;
    studentEmail: string;
    answer: StudentAnswer;
  }[] = [];

  if (isWrittenExam) {
    results.forEach((r) => {
      r.student.studentAnswers?.forEach((ans) => {
        if (ans.question?.type === 'WRITTEN' && ans.marksAwarded === null) {
          ungradedSubmissions.push({
            studentName: r.student.name,
            studentEmail: r.student.email,
            answer: ans,
          });
        }
      });
    });
  }

  // Attempt statistics
  const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
  const submittedCount = attempts.filter((a) => a.status === 'SUBMITTED').length;
  const expiredCount = attempts.filter((a) => a.status === 'EXPIRED').length;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch.name}</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-primary font-medium">Tests</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{test.title} Results</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Exam Management</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Monitor attempts, grade responses, and analyze performance for {test.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3">
            {test.type !== 'OFFLINE' && (
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
              >
                Finalize Exam
              </button>
            )}
            {test.type !== 'OFFLINE' && (
              <Link
                href={`/batches/${batchId}/tests/${testId}/manage`}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
              >
                Configure Questions
              </Link>
            )}
            <Link
              href={`/batches/${batchId}/tests`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
            >
              Back to Tests
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-success-bg p-4 border border-status-success-border">
            <p className="text-sm text-status-success-text font-medium">✓ {successMsg}</p>
          </div>
        )}

        {/* Tabs Control */}
        <div className="flex border-b border-border gap-x-1">
          {test.type !== 'OFFLINE' && (
            <button
              onClick={() => setActiveTab('attempts')}
              className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-x-2 ${
                activeTab === 'attempts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Attempts Monitor
              {attempts.length > 0 && (
                <Badge variant={inProgressCount > 0 ? 'primary' : 'neutral'} size="sm">
                  {attempts.length}
                </Badge>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-x-2 ${
              activeTab === 'leaderboard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Leaderboard
            {results.length > 0 && (
              <Badge variant="neutral" size="sm">
                {results.length}
              </Badge>
            )}
          </button>
          {isWrittenExam && (
            <button
              onClick={() => setActiveTab('grading')}
              className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-x-2 ${
                activeTab === 'grading'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Grade Written Responses
              {ungradedSubmissions.length > 0 && (
                <Badge variant="danger" size="sm">
                  {ungradedSubmissions.length}
                </Badge>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Score Entry
          </button>
        </div>

        {/* Tab 1: Attempts Monitor */}
        {activeTab === 'attempts' && (
          <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
                <span className="text-xs font-semibold text-muted-foreground">Total Enrolled</span>
                <p className="text-2xl font-bold text-foreground mt-1">{batchStudents.length}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
                <span className="text-xs font-semibold text-primary">In Progress</span>
                <p className="text-2xl font-bold text-foreground mt-1">{inProgressCount}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
                <span className="text-xs font-semibold text-status-success-text">Submitted</span>
                <p className="text-2xl font-bold text-foreground mt-1">{submittedCount}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
                <span className="text-xs font-semibold text-status-danger-text">Expired</span>
                <p className="text-2xl font-bold text-foreground mt-1">{expiredCount}</p>
              </div>
            </div>

            {/* Attempts DataTable */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Auto-refreshes every 30s • Timezone: <strong className="text-foreground">{getTimezoneDisplay(centerTz)}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAttempts()}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Refresh Now
                </button>
              </div>

              {attempts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  No students have started an attempt for this exam yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-hover/50">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Started</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline / Submitted</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extra Time</th>
                        <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {attempts.map((att) => {
                        const isSubmitted = att.status === 'SUBMITTED';
                        const isInProgress = att.status === 'IN_PROGRESS';

                        return (
                          <tr key={att.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-foreground">{att.student.name}</div>
                              <div className="text-xs text-muted-foreground">{att.student.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  isSubmitted
                                    ? 'success'
                                    : isInProgress
                                    ? 'primary'
                                    : 'danger'
                                }
                                size="sm"
                              >
                                {att.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                              {formatDateTime(att.startedAt, centerTz)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                              {isSubmitted && att.submittedAt
                                ? formatDateTime(att.submittedAt, centerTz)
                                : formatDateTime(att.deadlineAt, centerTz)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs">
                              {att.extendedMinutes > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-primary">+{att.extendedMinutes} min</span>
                                  {att.extendReason && (
                                    <p className="text-[11px] text-muted-foreground italic truncate max-w-[180px]" title={att.extendReason}>
                                      {att.extendReason}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                              {isInProgress && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtendTargetAttempt(att);
                                    setExtendMinutes('15');
                                    setExtendReason('');
                                    setExtendError(null);
                                  }}
                                  className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                                >
                                  Extend Time
                                </button>
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
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
            {results.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic text-sm">
                No submissions or graded results recorded for this exam yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-hover/50">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student Info</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marks Obtained</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score %</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submission Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {results.map((res) => {
                      const isTop3 = res.rank && res.rank <= 3;

                      return (
                        <tr key={res.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isTop3 ? (
                              <Badge
                                variant={res.rank === 1 ? 'accent' : res.rank === 2 ? 'primary' : 'secondary'}
                                size="sm"
                              >
                                {res.rank === 1 ? '👑 Rank 1' : res.rank === 2 ? '🥈 Rank 2' : '🥉 Rank 3'}
                              </Badge>
                            ) : (
                              <span className="text-sm font-semibold text-muted-foreground pl-2">
                                #{res.rank ?? '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-foreground">{res.student.name}</div>
                            <div className="text-xs text-muted-foreground">{res.student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                            {res.totalMarksObtained} <span className="text-xs font-medium text-muted-foreground">/ {test.totalMarks} Marks</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-x-2">
                              <span className="text-xs font-semibold text-foreground">
                                {Math.round((res.totalMarksObtained / test.totalMarks) * 100)}%
                              </span>
                              <div className="w-24 bg-surface-hover rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (res.totalMarksObtained / test.totalMarks) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                            {formatDateTime(res.submittedAt, centerTz)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Grade Written Answers */}
        {activeTab === 'grading' && isWrittenExam && (
          <div className="space-y-6">
            <div className="bg-surface-hover/50 border border-border rounded-2xl p-4 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">Written Grading Center:</span> Enter marks awarded for subjective essay answers. Scores update the student&apos;s total exam score and recompute competition rank.
            </div>

            {ungradedSubmissions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground rounded-[var(--radius-card)] border border-border bg-surface shadow-card italic text-sm">
                🎉 All written submissions have been fully graded!
              </div>
            ) : (
              <div className="space-y-6">
                {ungradedSubmissions.map(({ studentName, studentEmail, answer }) => (
                  <div
                    key={answer.id}
                    className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <div>
                        <span className="block text-sm font-bold text-foreground">{studentName}</span>
                        <span className="block text-xs text-muted-foreground">{studentEmail}</span>
                      </div>
                      <Badge variant="accent" size="sm">
                        Max: {answer.question.marks} Marks
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Question Prompt:
                      </span>
                      <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                        {answer.question.text}
                      </p>
                    </div>

                    <div className="space-y-1 bg-surface-hover/30 p-4 rounded-xl border border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Student&apos;s Answer:
                      </span>
                      <p className="text-sm text-foreground whitespace-pre-wrap font-mono">
                        {answer.writtenAnswerText || <span className="italic text-muted-foreground">No response provided</span>}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-x-3">
                        <label htmlFor={`score-${answer.id}`} className="text-xs font-semibold text-foreground">
                          Score Awarded:
                        </label>
                        <input
                          type="number"
                          id={`score-${answer.id}`}
                          min="0"
                          max={answer.question.marks}
                          step="0.5"
                          value={gradingScores[answer.id] ?? ''}
                          onChange={(e) =>
                            setGradingScores((prev) => ({ ...prev, [answer.id]: e.target.value }))
                          }
                          placeholder={`0 - ${answer.question.marks}`}
                          className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">/ {answer.question.marks}</span>
                      </div>

                      <button
                        type="button"
                        disabled={gradingSubmitting[answer.id]}
                        onClick={() => handleSaveGrade(answer.id, answer.question.marks)}
                        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                      >
                        {gradingSubmitting[answer.id] ? 'Saving...' : 'Submit Grade'}
                      </button>
                    </div>

                    {gradingErrors[answer.id] && (
                      <p className="text-xs text-status-danger-text font-medium">{gradingErrors[answer.id]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Manual Score Entry */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualMarks} className="space-y-6">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Manual & Offline Score Entry</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record offline marks or override scores for students enrolled in this batch. Max: {test.totalMarks} marks.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {savingManual ? 'Saving Scores...' : 'Save All Marks'}
                </button>
              </div>

              {batchStudents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  No students are enrolled in this batch yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-hover/50">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student Name</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marks Obtained</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {batchStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                            {st.name}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-muted-foreground">
                            {st.email}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-x-2">
                              <input
                                type="number"
                                min="0"
                                max={test.totalMarks}
                                step="0.5"
                                value={manualMarks[st.id] ?? ''}
                                onChange={(e) =>
                                  setManualMarks((prev) => ({ ...prev, [st.id]: e.target.value }))
                                }
                                placeholder="0"
                                className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-xs text-muted-foreground">/ {test.totalMarks}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Extend Time Modal */}
      {extendTargetAttempt && (
        <Modal
          isOpen={true}
          onClose={() => setExtendTargetAttempt(null)}
          title={`Extend Time for ${extendTargetAttempt.student.name}`}
          description="Grant additional minutes to an active exam attempt. An audit record will be logged."
        >
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            {extendError && (
              <div className="rounded-md bg-status-danger-bg p-3 border border-status-danger-border text-xs text-status-danger-text">
                {extendError}
              </div>
            )}

            <div>
              <label htmlFor="extendMinutes" className="block text-xs font-semibold text-foreground mb-1">
                Additional Minutes (1 - 60)
              </label>
              <input
                type="number"
                id="extendMinutes"
                min="1"
                max="60"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="extendReason" className="block text-xs font-semibold text-foreground mb-1">
                Reason for Extension (Required)
              </label>
              <textarea
                id="extendReason"
                rows={3}
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="e.g. Technical difficulty with local network connection during section 2."
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This reason will be attached to the attempt and recorded in the audit trail.
              </p>
            </div>

            <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setExtendTargetAttempt(null)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={extendSubmitting}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
              >
                {extendSubmitting ? 'Granting...' : 'Grant Extension'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Finalize Exam Modal */}
      {isFinalizeModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFinalizeModalOpen(false)}
          title="Finalize Exam"
          description="Submit all remaining expired attempts and recompute official competition ranks."
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Finalizing will evaluate all unsubmitted answers for students whose exam deadlines have passed. Ranks and scores will be updated across the center leaderboard.
            </p>
            <div className="rounded-[var(--radius-card)] bg-surface-hover/40 border border-border p-3 text-xs text-muted-foreground">
              Active in-progress attempts: <strong className="text-foreground">{inProgressCount}</strong>
              <br />
              Unfinalized expired attempts: <strong className="text-foreground">{expiredCount}</strong>
            </div>
            <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={finalizing}
                onClick={handleFinalizeExam}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
              >
                {finalizing ? 'Finalizing Exam...' : 'Confirm Finalize'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
