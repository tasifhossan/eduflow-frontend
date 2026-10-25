'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
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

  // States
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role validation & fetch result
  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'STUDENT') {
        router.push(`/batches/${batchId}/tests`);
        return;
      }
      loadResult();
    }

    async function loadResult() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await apiGet<{ success: boolean; data: ResultData }>(`/api/tests/${testId}/my-result`);
        if (res.success) {
          setResultData(res.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load test results');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, testId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading test results...</span>
      </div>
    );
  }

  if (errorMsg || !resultData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Results</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Results not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to tests list
        </Link>
      </div>
    );
  }

  const { result, answers } = resultData;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-primary font-medium">Tests</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{result.test.title} Result</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Exam Performance</h1>
            <p className="mt-2 text-sm text-muted-foreground">Graded report card for {result.test.title}</p>
          </div>
          <Link
            href={`/batches/${batchId}/tests`}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
          >
            Back to Tests
          </Link>
        </div>

        {/* Score Summary Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Score Obtained</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-extrabold text-primary">{result.totalMarksObtained}</span>
              <span className="text-sm text-muted-foreground font-medium">/ {result.test.totalMarks} Marks</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Class Rank</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-extrabold text-foreground">
                {result.rank ? `#${result.rank}` : <span className="text-muted-foreground italic text-xl">Pending</span>}
              </span>
              {result.rank && <span className="text-sm text-muted-foreground font-medium">in batch</span>}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Submitted At</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-xs font-semibold text-foreground">
                {new Date(result.submittedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Question-by-Question Graded Review */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">Questions Review</h2>

          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4 bg-surface border border-border rounded-[var(--radius-card)]">
              No questions found on this exam response.
            </p>
          ) : (
            <div className="space-y-6">
              {answers.map((ans, idx) => {
                const q = ans.question;
                const isMcq = q.type === 'MCQ';
                const isCorrect = isMcq && ans.selectedOptionId && q.options.find((o) => o.id === ans.selectedOptionId)?.isCorrect;
                const correctOption = isMcq ? q.options.find((o) => o.isCorrect) : null;
                const isGraded = ans.marksAwarded !== null && ans.marksAwarded !== undefined;

                return (
                  <div key={ans.id} className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-x-4">
                      <span className="inline-flex items-center gap-x-2 text-sm font-semibold text-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        Question {idx + 1} ({q.type})
                      </span>
                      
                      <span className="text-xs font-bold">
                        {isGraded ? (
                          <span className={ans.marksAwarded! >= q.marks ? 'text-green-600 dark:text-green-400' : ans.marksAwarded! > 0 ? 'text-amber-500' : 'text-red-500 dark:text-red-400'}>
                            {ans.marksAwarded} / {q.marks} Marks
                          </span>
                        ) : (
                          <span className="text-amber-500 italic bg-amber-500/10 rounded-md px-2 py-0.5 border border-amber-500/20">
                            Pending grading
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-medium text-foreground/90 whitespace-pre-wrap pl-8">
                      {q.text}
                    </p>

                    {/* MCQ Details */}
                    {isMcq ? (
                      <div className="pl-8 space-y-3">
                        {/* Option choices list */}
                        <div className="space-y-2 max-w-lg">
                          {q.options.map((o) => {
                            const isSelectedOption = ans.selectedOptionId === o.id;
                            const optionStyle = o.isCorrect
                              ? 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300 font-bold'
                              : isSelectedOption
                              ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 font-bold'
                              : 'border-border bg-surface text-foreground';

                            return (
                              <div
                                key={o.id}
                                className={`flex items-center gap-x-3 text-xs p-3 rounded-lg border ${optionStyle}`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                    o.isCorrect ? 'bg-green-600 dark:bg-green-400' : isSelectedOption ? 'bg-red-600 dark:bg-red-400' : 'bg-muted-foreground/40'
                                  }`}
                                />
                                <span className="flex-1">{o.text}</span>
                                {o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-green-700 dark:text-green-400">
                                    Correct Answer
                                  </span>
                                )}
                                {isSelectedOption && !o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-700 dark:text-red-400">
                                    Your Choice (Wrong)
                                  </span>
                                )}
                                {isSelectedOption && o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-green-700 dark:text-green-400">
                                    Your Choice (Correct)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {!ans.selectedOptionId && (
                          <p className="text-xs text-muted-foreground italic">
                            ⚠️ Question was left unanswered (0 marks).
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Written Details */
                      <div className="pl-8 space-y-2">
                        <div className="rounded-lg border border-border bg-surface-hover/50 p-4">
                          <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Your Written Response
                          </span>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {ans.writtenAnswerText || <span className="text-muted-foreground italic">No answer submitted</span>}
                          </p>
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
