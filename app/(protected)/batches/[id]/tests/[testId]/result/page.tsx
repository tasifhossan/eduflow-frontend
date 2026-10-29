'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useCenter } from '@/components/providers/center-provider';
import { formatDateTime } from '@/lib/tz';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronLeft,
  Info,
} from 'lucide-react';

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  type: 'MCQ' | 'WRITTEN';
  text: string;
  marks: number;
  options: Option[];
}

interface SelectedOptionDetails {
  id: string;
  text: string;
}

interface StudentAnswerDetails {
  id: string;
  questionId: string;
  selectedOptionId?: string | null;
  writtenAnswerText?: string | null;
  marksAwarded?: number | null;
  question: Question;
  selectedOption?: SelectedOptionDetails | null;
}

interface ResultSummary {
  id: string;
  totalMarksObtained: number;
  rank?: number | null;
  submittedAt: string;
  test: {
    id: string;
    title: string;
    type: string;
    totalMarks: number;
    testDate: string;
    durationMinutes?: number | null;
    windowEndsAt?: string | null;
  };
}

interface ResultData {
  result: ResultSummary;
  answers: StudentAnswerDetails[];
}

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default function TestResultPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId, testId } = use(params);
  const { center } = useCenter();
  const timezone = center.timezone || 'Asia/Dhaka';

  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }

      const res = await apiGet<{ success: boolean; data: ResultData }>(`/api/tests/${testId}/my-result`);
      if (res.success && res.data) {
        setResultData(res.data);
      } else {
        throw new Error('Result record not found');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  }, [testId, router]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) {
        await loadResult();
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [loadResult]);

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-1/3 rounded-[var(--radius-control)]" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        </div>
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (errorMsg || !resultData) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <ErrorState
          title="Result Unavailable"
          message={errorMsg || 'Results not found or you have not completed this test yet.'}
          onRetry={loadResult}
        />
        <div className="mt-4 text-center">
          <Button variant="outline" asChild>
            <Link href={`/batches/${batchId}/tests`}>&larr; Back to Tests</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { result, answers } = resultData;

  // Check if correct answers are hidden by checking if any MCQ option has isCorrect undefined
  const hasHiddenAnswers = answers.some(
    (a) => a.question.type === 'MCQ' && a.question.options.some((o) => o.isCorrect === undefined)
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center text-xs sm:text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary transition font-medium">
            Batches
          </Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-primary transition font-medium">
            Tests
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-xs">{result.test.title} Result</span>
        </nav>

        {/* Header Confirmation Card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="completed" label="Exam Completed" />
              <span className="text-xs text-muted-foreground">
                Submitted on {formatDateTime(result.submittedAt, timezone)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {result.test.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Performance report for {result.test.type} examination
            </p>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/batches/${batchId}/tests`} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back to Tests
            </Link>
          </Button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Score */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Marks Obtained
            </span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-primary">
                {result.totalMarksObtained}
              </span>
              <span className="text-sm text-muted-foreground font-medium">/ {result.test.totalMarks}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              {Math.round((result.totalMarksObtained / (result.test.totalMarks || 1)) * 100)}% overall score
            </span>
          </div>

          {/* Rank with Competition Ties */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Batch Rank
            </span>
            <div className="mt-2 flex items-baseline gap-x-2">
              {result.rank ? (
                <>
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground">
                    #{result.rank}
                  </span>
                  <span className="text-xs text-muted-foreground">rank in batch</span>
                </>
              ) : (
                <span className="text-xl font-bold text-muted-foreground italic">Pending</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              Competition ranking (ties share ranks)
            </span>
          </div>

          {/* Submission Info */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Exam Details
            </span>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {result.test.type} Exam
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{result.test.durationMinutes ? `${result.test.durationMinutes} mins` : 'Untimed'}</span>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">Question-by-Question Review</h2>
          </div>

          {hasHiddenAnswers ? (
            /* Exam window still open notice */
            <div className="p-6 rounded-[var(--radius-card)] border border-border bg-surface text-center space-y-3 shadow-card">
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
                <Info className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Results appear when the exam closes
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                To preserve academic integrity for all students while the testing window remains active, detailed answer review and correct option markings will be released automatically once the exam window concludes.
              </p>
            </div>
          ) : answers.length === 0 ? (
            <div className="p-8 rounded-[var(--radius-card)] border border-border bg-surface text-center text-muted-foreground text-sm">
              No detailed question records found for this submission.
            </div>
          ) : (
            /* Full answers breakdown once released */
            <div className="space-y-4">
              {answers.map((ans, idx) => {
                const q = ans.question;
                const isMCQ = q.type === 'MCQ';

                // Evaluate correctness for MCQ
                let isCorrect = false;
                let isAnswered = false;
                if (isMCQ) {
                  const correctOpt = q.options.find((o) => o.isCorrect === true);
                  isAnswered = !!ans.selectedOptionId;
                  isCorrect = isAnswered && !!correctOpt && ans.selectedOptionId === correctOpt.id;
                }

                return (
                  <div
                    key={ans.id || idx}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-surface-hover border border-border text-foreground">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium uppercase">
                          {q.type} • {q.marks} Marks
                        </span>
                      </div>

                      {isMCQ ? (
                        isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-status-success-bg text-status-success-text">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+{q.marks})
                          </span>
                        ) : isAnswered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-status-danger-bg text-status-danger-text">
                            <XCircle className="h-3.5 w-3.5" /> Incorrect
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-surface-hover text-muted-foreground">
                            <HelpCircle className="h-3.5 w-3.5" /> Unanswered (0)
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-primary">
                          {ans.marksAwarded !== null && ans.marksAwarded !== undefined
                            ? `Graded: ${ans.marksAwarded} / ${q.marks}`
                            : 'Pending Teacher Grading'}
                        </span>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <p className="text-sm sm:text-base font-medium text-foreground whitespace-pre-wrap">
                      {q.text}
                    </p>

                    {/* MCQ Options Display */}
                    {isMCQ && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt) => {
                          const isStudentPick = ans.selectedOptionId === opt.id;
                          const isOptCorrect = opt.isCorrect === true;

                          let rowClass = 'border-border bg-surface text-foreground';
                          if (isOptCorrect) {
                            rowClass = 'border-status-success-text/40 bg-status-success-bg text-status-success-text font-medium';
                          } else if (isStudentPick && !isOptCorrect) {
                            rowClass = 'border-status-danger-text/40 bg-status-danger-bg text-status-danger-text';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between p-3 rounded-[var(--radius-control)] border text-sm ${rowClass}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold shrink-0">
                                  {isOptCorrect ? '✓' : isStudentPick ? '✕' : '•'}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                              <div className="text-xs shrink-0 flex items-center gap-1 font-semibold">
                                {isStudentPick && <span>(Your Answer)</span>}
                                {isOptCorrect && <span>(Correct Answer)</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Written Response Display */}
                    {!isMCQ && (
                      <div className="space-y-2 pt-1">
                        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-xs sm:text-sm text-foreground whitespace-pre-wrap">
                          {ans.writtenAnswerText || <span className="text-muted-foreground italic">No answer provided.</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
