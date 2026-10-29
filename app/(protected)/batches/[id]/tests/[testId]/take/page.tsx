'use client';

import React, { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useCenter } from '@/components/providers/center-provider';
import { formatDateTime } from '@/lib/tz';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  RefreshCw,
  Check,
} from 'lucide-react';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: 'MCQ' | 'WRITTEN';
  text: string;
  marks: number;
  order: number;
  options: Option[];
}

interface TestAttempt {
  id: string;
  startedAt: string;
  deadlineAt: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  remainingSeconds?: number;
  serverNow?: string;
}

interface TestDetails {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE';
  totalMarks: number;
  negativeMarkingValue: number;
  durationMinutes?: number | null;
  testDate: string;
  windowEndsAt?: string | null;
  batchId: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

interface SavedAnswer {
  questionId: string;
  optionId?: string | null;
  textAnswer?: string | null;
}

type ExamState =
  | 'LOADING'
  | 'NOT_OPEN_YET'
  | 'INSTRUCTIONS'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CLOSED_AND_MISSED'
  | 'ERROR';

type AutosaveStatus = 'saved' | 'saving' | 'offline';

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default function TakeExamPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId, testId } = use(params);
  const { center } = useCenter();
  const timezone = center.timezone || 'Asia/Dhaka';

  // Overall State Machine
  const [examState, setExamState] = useState<ExamState>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test & Attempt Metadata
  const [test, setTest] = useState<TestDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  // Navigation & Answers
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string | null; textAnswer?: string | null }>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());

  // Timer & Drift
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const serverOffsetRef = useRef<number>(0); // clientNow - serverNow in ms
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
  const announcedRef = useRef<{ m5: boolean; m1: boolean; s10: boolean }>({ m5: false, m1: false, s10: false });

  // Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const isDirtyRef = useRef(false);
  const isAutoSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const triggerFinalSubmitRef = useRef<(isAutomatic?: boolean) => Promise<boolean | void>>(async () => {});

  // Local Storage Key
  const backupStorageKey = `eduflow_answers_backup_${testId}`;

  // 1. Initial Load & State Resolution
  const initExam = useCallback(async () => {
    try {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'STUDENT') {
        router.push(`/batches/${batchId}/tests`);
        return;
      }

      // 1. Check if already submitted
      try {
        const resCheck = await apiGet<{ success: boolean }>(`/api/tests/${testId}/my-result`);
        if (resCheck?.success) {
          setExamState('SUBMITTED');
          return;
        }
      } catch {
        // Result not found means not submitted yet, continue
      }

      // 2. Fetch test metadata
      const testRes = await apiGet<{ success: boolean; data: TestDetails }>(`/api/tests/${testId}`);
      if (!testRes.success || !testRes.data) {
        throw new Error('Test not found or access denied');
      }

      const testData = testRes.data;
      setTest(testData);

      const now = new Date();
      const testDate = new Date(testData.testDate);
      const effectiveWindowEnd = testData.windowEndsAt
        ? new Date(testData.windowEndsAt)
        : testData.durationMinutes
        ? new Date(testDate.getTime() + testData.durationMinutes * 60 * 1000)
        : testDate;

      // Check if test hasn't started yet
      if (now < testDate) {
        setExamState('NOT_OPEN_YET');
        return;
      }

      // 3. Check if an attempt already exists
      try {
        const attemptRes = await apiGet<{
          success: boolean;
          data: {
            attempt: TestAttempt;
            savedAnswers: SavedAnswer[];
            result: unknown;
          };
        }>(`/api/tests/${testId}/attempt`);

        if (attemptRes.success && attemptRes.data?.attempt) {
          const existingAttempt = attemptRes.data.attempt;

          if (existingAttempt.status === 'SUBMITTED' || attemptRes.data.result) {
            setExamState('SUBMITTED');
            return;
          }

          if (existingAttempt.status === 'EXPIRED') {
            setExamState('CLOSED_AND_MISSED');
            return;
          }

          // In-progress attempt exists: restore questions by calling start (idempotent)
          const startRes = await apiPost<{
            success: boolean;
            data: {
              attempt: TestAttempt;
              questions: Question[];
            };
          }>(`/api/tests/${testId}/start`);

          if (startRes.success && startRes.data) {
            setQuestions(startRes.data.questions || []);
            setAttempt(startRes.data.attempt);

            // Calculate server clock offset
            const serverNowMs = startRes.data.attempt.serverNow
              ? new Date(startRes.data.attempt.serverNow).getTime()
              : Date.now();
            serverOffsetRef.current = Date.now() - serverNowMs;

            // Compute remaining seconds from deadline
            const deadlineMs = new Date(startRes.data.attempt.deadlineAt).getTime();
            const initialRemaining = Math.max(0, Math.floor((deadlineMs - (Date.now() - serverOffsetRef.current)) / 1000));
            setRemainingSeconds(initialRemaining);

            // Populate saved answers from server
            const answersMap: Record<string, { optionId?: string | null; textAnswer?: string | null }> = {};
            if (attemptRes.data.savedAnswers) {
              for (const sa of attemptRes.data.savedAnswers) {
                answersMap[sa.questionId] = {
                  optionId: sa.optionId || null,
                  textAnswer: sa.textAnswer || null,
                };
              }
            }

            // Fallback restore from localStorage if newer
            try {
              const localBackup = localStorage.getItem(backupStorageKey);
              if (localBackup) {
                const parsed = JSON.parse(localBackup);
                Object.assign(answersMap, parsed);
              }
            } catch {}

            setAnswers(answersMap);
            setExamState('IN_PROGRESS');
            return;
          }
        }
      } catch {
        // No attempt yet
      }

      // If no attempt exists and window has already closed -> missed
      if (now >= effectiveWindowEnd) {
        setExamState('CLOSED_AND_MISSED');
        return;
      }

      // Ready to show instructions screen
      setExamState('INSTRUCTIONS');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to initialize exam');
      setExamState('ERROR');
    }
  }, [batchId, testId, router, backupStorageKey]);

  useEffect(() => {
    let isMounted = true;
    const runInit = async () => {
      if (isMounted) {
        await initExam();
      }
    };
    runInit();
    return () => {
      isMounted = false;
    };
  }, [initExam]);

  // 2. Start Exam Handler (from Instructions)
  const handleStartExam = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await apiPost<{
        success: boolean;
        data: {
          attempt: TestAttempt;
          questions: Question[];
        };
      }>(`/api/tests/${testId}/start`);

      if (res.success && res.data) {
        setQuestions(res.data.questions || []);
        setAttempt(res.data.attempt);

        const serverNowMs = res.data.attempt.serverNow
          ? new Date(res.data.attempt.serverNow).getTime()
          : Date.now();
        serverOffsetRef.current = Date.now() - serverNowMs;

        const deadlineMs = new Date(res.data.attempt.deadlineAt).getTime();
        const initialRemaining = Math.max(0, Math.floor((deadlineMs - (Date.now() - serverOffsetRef.current)) / 1000));
        setRemainingSeconds(initialRemaining);

        setExamState('IN_PROGRESS');
      } else {
        throw new Error('Failed to start test attempt');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Unable to start exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Drift-Proof Timer Ticker
  useEffect(() => {
    if (examState !== 'IN_PROGRESS' || !attempt) return;

    const interval = setInterval(() => {
      const deadlineMs = new Date(attempt.deadlineAt).getTime();
      const currentServerTime = Date.now() - serverOffsetRef.current;
      const secLeft = Math.max(0, Math.floor((deadlineMs - currentServerTime) / 1000));

      setRemainingSeconds(secLeft);

      // Aria-live announcements
      if (secLeft <= 300 && secLeft > 290 && !announcedRef.current.m5) {
        announcedRef.current.m5 = true;
        setAriaAnnouncement('Warning: 5 minutes remaining in exam.');
      }
      if (secLeft <= 60 && secLeft > 50 && !announcedRef.current.m1) {
        announcedRef.current.m1 = true;
        setAriaAnnouncement('Urgent: 1 minute remaining in exam.');
      }
      if (secLeft <= 10 && secLeft > 0 && !announcedRef.current.s10) {
        announcedRef.current.s10 = true;
        setAriaAnnouncement('10 seconds remaining.');
      }

      // Auto-submit at zero
      if (secLeft === 0 && !isAutoSubmittingRef.current) {
        isAutoSubmittingRef.current = true;
        triggerFinalSubmitRef.current(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [examState, attempt]);

  // 4. Autosave Engine
  const performAutosave = useCallback(async () => {
    if (examState !== 'IN_PROGRESS' || isSubmitting) return;

    const answersList = Object.entries(answers)
      .map(([questionId, val]) => ({
        questionId,
        optionId: val.optionId || null,
        textAnswer: val.textAnswer || null,
      }))
      .filter((a) => a.optionId || (typeof a.textAnswer === 'string' && a.textAnswer.trim().length > 0));

    if (answersList.length === 0) return;

    setAutosaveStatus('saving');
    try {
      // Save locally first
      localStorage.setItem(backupStorageKey, JSON.stringify(answers));

      const res = await apiPut<{ success: boolean; data?: { savedAt?: string } }>(
        `/api/tests/${testId}/attempt/answers`,
        { answers: answersList }
      );

      if (res && res.success) {
        setAutosaveStatus('saved');
        isDirtyRef.current = false;
      }
    } catch (err: unknown) {
      const errorObj = err as { data?: { code?: string }; message?: string };
      if (errorObj?.data?.code === 'ATTEMPT_CLOSED' || errorObj?.message?.includes('ATTEMPT_CLOSED')) {
        // Attempt closed by deadline -> transition to submitted or result view
        setExamState('SUBMITTED');
        return;
      }
      setAutosaveStatus('offline');
    }
  }, [examState, isSubmitting, answers, backupStorageKey, testId]);

  // Debounced Autosave (1.5s after change) + Periodic Pulse (15s)
  useEffect(() => {
    if (examState !== 'IN_PROGRESS') return;

    if (isDirtyRef.current) {
      const timeout = setTimeout(() => {
        performAutosave();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [answers, examState, performAutosave]);

  useEffect(() => {
    if (examState !== 'IN_PROGRESS') return;

    const interval = setInterval(() => {
      performAutosave();
    }, 15000);

    return () => clearInterval(interval);
  }, [examState, performAutosave]);

  // 5. Final Submission Handler with Offline Retry
  const triggerFinalSubmit = useCallback(async (isAutomatic = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      answers: questions.map((q) => {
        const val = answers[q.id];
        return {
          questionId: q.id,
          selectedOptionId: val?.optionId || null,
          writtenAnswerText: val?.textAnswer || null,
        };
      }),
    };

    // Store in localStorage backup
    try {
      localStorage.setItem(backupStorageKey, JSON.stringify(answers));
    } catch {}

    const submitWithRetry = async (attemptsLeft = 5): Promise<boolean> => {
      try {
        const res = await apiPost<{ success: boolean; data?: { resultId: string } }>(
          `/api/tests/${testId}/submit`,
          payload
        );

        if (res && res.success) {
          localStorage.removeItem(backupStorageKey);
          setExamState('SUBMITTED');
          setShowSubmitModal(false);
          return true;
        }
      } catch (err: unknown) {
        const errorObj = err as { data?: { code?: string }; status?: number };
        if (
          errorObj?.data?.code === 'ALREADY_SUBMITTED' ||
          errorObj?.data?.code === 'ATTEMPT_CLOSED' ||
          errorObj?.status === 409
        ) {
          localStorage.removeItem(backupStorageKey);
          setExamState('SUBMITTED');
          setShowSubmitModal(false);
          return true;
        }

        if (attemptsLeft > 1) {
          setErrorMessage(
            isAutomatic
              ? 'Network issue while submitting. Retrying automatically in 3s...'
              : 'Connection error. Retrying submission...'
          );
          await new Promise((r) => setTimeout(r, 3000));
          return submitWithRetry(attemptsLeft - 1);
        }
      }
      return false;
    };

    const succeeded = await submitWithRetry();
    if (!succeeded) {
      setErrorMessage(
        'Submission failed due to network disruption. Your answers remain saved locally. Please click "Retry Submit" below.'
      );
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, backupStorageKey, testId]);

  useEffect(() => {
    triggerFinalSubmitRef.current = triggerFinalSubmit;
  }, [triggerFinalSubmit]);

  // 6. Answer Selection Handlers
  const handleSelectOption = (questionId: string, optionId: string) => {
    isDirtyRef.current = true;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        optionId,
      },
    }));
  };

  const handleWrittenTextChange = (questionId: string, text: string) => {
    isDirtyRef.current = true;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        textAnswer: text,
      },
    }));
  };

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // 7. Keyboard Shortcuts (1-4 for options, n for next, f for flag)
  useEffect(() => {
    if (examState !== 'IN_PROGRESS' || questions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

      const currentQ = questions[currentIdx];
      if (!currentQ) return;

      if (currentQ.type === 'MCQ' && ['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQ.options && currentQ.options[optIdx]) {
          e.preventDefault();
          handleSelectOption(currentQ.id, currentQ.options[optIdx].id);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        if (currentIdx < questions.length - 1) {
          e.preventDefault();
          setCurrentIdx((i) => i + 1);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (currentIdx > 0) {
          e.preventDefault();
          setCurrentIdx((i) => i - 1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlagQuestion(currentQ.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [examState, questions, currentIdx]);

  // Format Timer mm:ss or hh:mm:ss
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────────────────────────

  // Loading Skeleton
  if (examState === 'LOADING') {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-2/3 rounded-[var(--radius-control)]" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        </div>
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  // Not Open Yet
  if (examState === 'NOT_OPEN_YET' && test) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-card text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{test.title}</h1>
          <p className="text-sm text-muted-foreground">
            This examination is not open yet. It will open on:
          </p>
          <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/50 text-foreground font-semibold text-base">
            {formatDateTime(test.testDate, timezone)}
          </div>
          <p className="text-xs text-muted-foreground">
            Timezone: {timezone} • Please return at the scheduled start time.
          </p>
          <div className="pt-4">
            <Button variant="outline" asChild>
              <Link href={`/batches/${batchId}/tests`}>&larr; Back to Tests</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Closed and Missed
  if (examState === 'CLOSED_AND_MISSED') {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-card text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-status-danger-bg text-status-danger-text">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exam Window Closed</h1>
          <p className="text-sm text-muted-foreground">
            The deadline for this exam has passed. If you had an active attempt, your answers have been recorded.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/batches/${batchId}/tests`}>Back to Tests</Link>
            </Button>
            <Button asChild>
              <Link href={`/batches/${batchId}/tests/${testId}/result`}>Check Result</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Submitted Confirmation View
  if (examState === 'SUBMITTED') {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-card text-center space-y-4 animate-in fade-in duration-200">
          <div className="inline-flex p-3 rounded-full bg-status-success-bg text-status-success-text">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exam Submitted!</h1>
          <p className="text-sm text-muted-foreground">
            Your examination answers have been securely received and saved to the server.
          </p>
          <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-xs text-muted-foreground">
            Submission timestamp: {formatDateTime(new Date().toISOString(), timezone)}
          </div>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/batches/${batchId}/tests`}>Back to Tests List</Link>
            </Button>
            <Button asChild>
              <Link href={`/batches/${batchId}/tests/${testId}/result`}>View Performance & Report</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (examState === 'ERROR') {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <ErrorState
          title="Exam Unavailable"
          message={errorMessage || 'An error occurred while loading this exam.'}
          onRetry={initExam}
        />
      </div>
    );
  }

  // Instructions Screen
  if (examState === 'INSTRUCTIONS' && test) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 shadow-card space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <StatusBadge variant="in_progress" label={`${test.type} Examination`} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {test.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Scheduled on {formatDateTime(test.testDate, timezone)}
            </p>
          </div>

          {/* Key Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/40 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Duration</span>
              <span className="text-lg font-bold text-foreground mt-1 block">
                {test.durationMinutes ? `${test.durationMinutes} mins` : 'Untimed'}
              </span>
            </div>
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/40 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Total Marks</span>
              <span className="text-lg font-bold text-primary mt-1 block">{test.totalMarks}</span>
            </div>
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/40 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Negative Mark</span>
              <span className="text-lg font-bold text-foreground mt-1 block">
                {test.negativeMarkingValue > 0 ? `-${test.negativeMarkingValue}` : 'None'}
              </span>
            </div>
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/40 text-center">
              <span className="text-xs text-muted-foreground block font-medium">Window Closes</span>
              <span className="text-xs font-semibold text-foreground mt-2 block truncate">
                {test.windowEndsAt ? formatDateTime(test.windowEndsAt, timezone) : 'At end of time'}
              </span>
            </div>
          </div>

          {/* Instructions List */}
          <div className="rounded-[var(--radius-control)] border border-border bg-surface-hover/20 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Important Exam Guidelines
            </h3>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong>Immediate Timer:</strong> The countdown timer will start immediately when you click <strong>Start Exam</strong>.
              </li>
              <li>
                <strong>Autosave:</strong> Your answers are saved automatically every few seconds and stored locally in case of network drops.
              </li>
              <li>
                <strong>Navigation:</strong> You can navigate freely between questions using the Question Palette or the Next/Previous buttons.
              </li>
              <li>
                <strong>Keyboard Shortcuts:</strong> Press <strong>1–4</strong> to choose options, <strong>N</strong> for next question, and <strong>F</strong> to flag for review.
              </li>
              {test.negativeMarkingValue > 0 && (
                <li className="text-status-danger-text font-medium">
                  Negative marking is enabled: each incorrect MCQ deducts {test.negativeMarkingValue} marks. Unanswered questions do not incur a penalty.
                </li>
              )}
            </ul>
          </div>

          {/* Launch Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Link
              href={`/batches/${batchId}/tests`}
              className="text-sm text-muted-foreground hover:text-foreground transition order-2 sm:order-1"
            >
              Cancel and return
            </Link>
            <Button
              size="lg"
              onClick={handleStartExam}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Starting Exam...
                </>
              ) : (
                'Start Exam Now'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IN-PROGRESS EXAM ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.values(answers).filter(
    (a) => a.optionId || (typeof a.textAnswer === 'string' && a.textAnswer.trim().length > 0)
  ).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const flaggedCount = flaggedQuestionIds.size;

  // Timer Warning Levels
  const isDangerTime = remainingSeconds <= 60;
  const isWarningTime = remainingSeconds <= 300 && !isDangerTime;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Hidden Aria-Live Announcer for Accessibility */}
      <div aria-live="polite" className="sr-only">
        {ariaAnnouncement}
      </div>

      {/* Top Fixed Sticky HUD Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Exam Title & Current Index */}
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate max-w-xs sm:max-w-md">
              {test?.title || 'Online Examination'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIdx + 1} of {questions.length} • {currentQuestion?.marks || 1} mark(s)
            </p>
          </div>

          {/* Status HUD: Autosave Indicator & Prominent Countdown Timer */}
          <div className="flex items-center gap-3">
            {/* Autosave Pill */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-[var(--radius-pill)] border border-border bg-surface-hover/30">
              {autosaveStatus === 'saving' && (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                  <span>Saving...</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <>
                  <Cloud className="h-3.5 w-3.5 text-status-success-text" />
                  <span>Saved</span>
                </>
              )}
              {autosaveStatus === 'offline' && (
                <>
                  <CloudOff className="h-3.5 w-3.5 text-status-warning-text" />
                  <span className="text-status-warning-text font-medium">Offline - retrying</span>
                </>
              )}
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-control)] border font-mono font-bold text-sm sm:text-base tracking-wider ${
                isDangerTime
                  ? 'bg-status-danger-bg text-status-danger-text border-status-danger-text/30 animate-pulse'
                  : isWarningTime
                  ? 'bg-status-warning-bg text-status-warning-text border-status-warning-text/30'
                  : 'bg-surface border-border text-foreground'
              }`}
              role="timer"
              aria-label={`Time remaining: ${formatTimer(remainingSeconds)}`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit Exam Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowSubmitModal(true)}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Examination Canvas */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Question Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-[var(--radius-control)] border border-status-danger-text/20 bg-status-danger-bg text-status-danger-text text-sm flex items-center justify-between">
              <span>{errorMessage}</span>
              <Button size="sm" variant="outline" onClick={() => triggerFinalSubmit(false)}>
                Retry Submit
              </Button>
            </div>
          )}

          {currentQuestion ? (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 shadow-card space-y-6">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-[var(--radius-control)] bg-primary/10 text-primary font-bold text-xs">
                    Q{currentIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {currentQuestion.type}
                  </span>
                </div>

                {/* Flag Question Toggle */}
                <button
                  type="button"
                  onClick={() => toggleFlagQuestion(currentQuestion.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-pill)] border transition ${
                    flaggedQuestionIds.has(currentQuestion.id)
                      ? 'border-status-warning-text/40 bg-status-warning-bg text-status-warning-text'
                      : 'border-border text-muted-foreground hover:bg-surface-hover'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>{flaggedQuestionIds.has(currentQuestion.id) ? 'Flagged' : 'Flag for review'}</span>
                </button>
              </div>

              {/* Question Body */}
              <div className="text-base sm:text-lg font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                {currentQuestion.text}
              </div>

              {/* Answer Area: MCQ Options */}
              {currentQuestion.type === 'MCQ' && (
                <div className="space-y-3 pt-2" role="radiogroup" aria-label="Multiple choice options">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id]?.optionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        className={`w-full flex items-center text-left p-4 rounded-[var(--radius-control)] border transition group ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                            : 'border-border bg-surface hover:bg-surface-hover/50 text-foreground'
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold mr-3 shrink-0 transition ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-surface-hover border border-border text-muted-foreground group-hover:border-primary/50'
                          }`}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-sm sm:text-base leading-snug flex-1">{option.text}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition mr-1 hidden sm:inline">
                          [{optIdx + 1}]
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Answer Area: Written Essay / Response */}
              {currentQuestion.type === 'WRITTEN' && (
                <div className="space-y-2 pt-2">
                  <label htmlFor="written-answer-box" className="text-xs font-semibold text-muted-foreground">
                    Your Response:
                  </label>
                  <textarea
                    id="written-answer-box"
                    rows={8}
                    value={answers[currentQuestion.id]?.textAnswer || ''}
                    onChange={(e) => handleWrittenTextChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full rounded-[var(--radius-control)] border border-border bg-surface p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-sans leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Write clearly and concisely.</span>
                    <span>
                      {(answers[currentQuestion.id]?.textAnswer || '').length} characters
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-border pt-4 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Use <strong>1–4</strong> to pick, <strong>N</strong> next, <strong>F</strong> flag
                </span>

                {currentIdx < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="gap-1.5"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowSubmitModal(true)}
                    className="gap-1.5"
                  >
                    Review & Submit <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center text-muted-foreground">
              No questions found on this exam.
            </div>
          )}
        </div>

        {/* Right Column: Question Palette & Review Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-4">
            <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-normal text-muted-foreground">
                {answeredCount}/{questions.length} answered
              </span>
            </h2>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-border bg-surface" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-status-warning-bg border border-status-warning-text/40" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded ring-2 ring-primary border border-border bg-surface" />
                <span>Current</span>
              </div>
            </div>

            {/* Palette Buttons Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered =
                  ans?.optionId || (typeof ans?.textAnswer === 'string' && ans.textAnswer.trim().length > 0);
                const isCurrent = idx === currentIdx;
                const isFlagged = flaggedQuestionIds.has(q.id);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-full rounded-[var(--radius-control)] text-xs font-bold transition flex items-center justify-center relative ${
                      isCurrent
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface z-10'
                        : ''
                    } ${
                      isFlagged
                        ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-text/40'
                        : isAnswered
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-status-warning-text" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Summary Progress */}
            <div className="pt-2 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Progress:</span>
                <span className="font-semibold text-foreground">
                  {Math.round((answeredCount / (questions.length || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / (questions.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => !isSubmitting && setShowSubmitModal(false)}
        title="Confirm Exam Submission"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setShowSubmitModal(false)}
            >
              Back to Exam
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={() => triggerFinalSubmit(false)}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                'Yes, Submit Now'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground">
            Please review your completion status before final submission. Once submitted, your answers cannot be altered.
          </p>

          <div className="grid grid-cols-3 gap-3 p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-center">
            <div>
              <span className="text-xs text-muted-foreground block">Answered</span>
              <span className="text-lg font-bold text-status-success-text">{answeredCount}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Unanswered</span>
              <span className={`text-lg font-bold ${unansweredCount > 0 ? 'text-status-warning-text' : 'text-foreground'}`}>
                {unansweredCount}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Flagged</span>
              <span className="text-lg font-bold text-status-warning-text">{flaggedCount}</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-[var(--radius-control)] border border-status-warning-text/30 bg-status-warning-bg text-status-warning-text text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>You have <strong>{unansweredCount}</strong> unanswered question(s). You can still return to answer them.</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
