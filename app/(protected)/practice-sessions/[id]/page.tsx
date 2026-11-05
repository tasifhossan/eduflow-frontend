'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient, UserClaims } from '@/lib/client-auth';
import { formatDateTime } from '@/lib/format';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  marks: number;
  options: Option[];
}

interface QuestionReview {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  correct: boolean;
}

interface PracticeSessionData {
  sessionId: string;
  batchId: string;
  chapterIds: string[];
  totalQuestions: number;
  correctAnswers?: number | null;
  score?: number | null;
  createdAt: string;
  submittedAt?: string | null;
  answers?: QuestionReview[] | null;
  questions: Question[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TakePracticeSessionPage({ params }: PageProps) {
  const router = useRouter();
  const { id: sessionId } = use(params);

  const [user, setUser] = useState<UserClaims | null>(null);
  const [session, setSession] = useState<PracticeSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Answers State: maps questionId to selectedOptionId
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Review Result State (set after submit or loaded from submitted session)
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    submittedAt: string;
    answers: QuestionReview[];
  } | null>(null);

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUserClient();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      if (currentUser.role !== 'STUDENT') {
        router.push('/dashboard');
        return;
      }
      setUser(currentUser);
      loadPracticeSession(currentUser.id);
    }

    async function loadPracticeSession(studentId: string) {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await apiGet<{ success: boolean; data: PracticeSessionData }>(
          `/api/students/${studentId}/practice-sessions/${sessionId}`
        );

        if (res && res.success && res.data) {
          setSession(res.data);

          // If session was already submitted in past, populate submissionResult directly
          if (res.data.submittedAt && res.data.answers) {
            setSubmissionResult({
              score: res.data.score || 0,
              correctAnswers: res.data.correctAnswers || 0,
              totalQuestions: res.data.totalQuestions,
              submittedAt: res.data.submittedAt,
              answers: res.data.answers,
            });
          }
        } else {
          setErrorMsg('Failed to load practice session.');
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load practice session.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [sessionId, router]);

  const handleOptionSelect = (qId: string, optId: string) => {
    if (submissionResult || session?.submittedAt) return; // Read-only if already submitted
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session || isSubmitting || submissionResult) return;

    const payloadAnswers = session.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selectedAnswers[q.id] || null,
    }));

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const response = await apiPost<{
        success: boolean;
        message: string;
        data: {
          sessionId: string;
          score: number;
          correctAnswers: number;
          totalQuestions: number;
          submittedAt: string;
          answers: QuestionReview[];
        };
      }>(`/api/students/${user.id}/practice-sessions/${sessionId}/submit`, {
        answers: payloadAnswers,
      });

      if (response && response.success && response.data) {
        setSubmissionResult(response.data);
      } else {
        setErrorMsg(response.message || 'Failed to submit practice session.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during practice submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg font-medium text-muted-foreground">Preparing practice session...</span>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <ErrorState
          title="Error Loading Practice Session"
          message={errorMsg}
          onRetry={() => window.location.reload()}
        />
        {user && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${user.id}`}>
              &larr; Back to My Profile
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // Combine review array lookup if submitted
  const reviewMap = new Map<string, QuestionReview>();
  if (submissionResult) {
    for (const rev of submissionResult.answers) {
      reviewMap.set(rev.questionId, rev);
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <nav className="flex text-sm text-muted-foreground gap-x-2">
            {user && (
              <Link href={`/students/${user.id}`} className="hover:text-primary font-medium">
                My Profile
              </Link>
            )}
            <span>/</span>
            <span className="text-foreground font-semibold">Practice Session</span>
          </nav>
          {user && (
            <Link
              href={`/students/${user.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
            >
              Back to Profile
            </Link>
          )}
        </div>

        {/* Practice Session Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-x-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  🎯 Targeted Practice
                </span>
                <span className="text-xs text-muted-foreground">({session?.totalQuestions} Questions)</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight font-poppins text-foreground">Weak Chapters Practice</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Practice mode does not write to formal test results or affect class ranks.
              </p>
            </div>

            {submissionResult && (
              <div className="flex items-center gap-x-3 bg-muted/50 rounded-xl p-3 border border-border">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Score Achieved
                  </span>
                  <span className="text-2xl font-extrabold text-foreground font-mono">
                    {submissionResult.score}%
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                    Correct
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {submissionResult.correctAnswers} / {submissionResult.totalQuestions}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="rounded-xl bg-status-danger-bg p-4 border border-status-danger-border text-sm text-status-danger-text">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}

        {/* Submission Results Summary Card */}
        {submissionResult && (
          <div className="rounded-2xl border border-status-success-border bg-status-success-bg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-status-success-text flex items-center gap-x-2">
                <span>🎉 Practice Completed!</span>
              </h2>
              <span className="text-xs font-semibold text-status-success-text">
                Submitted on {formatDateTime(submissionResult.submittedAt)}
              </span>
            </div>
            <p className="text-xs text-status-success-text">
              Review your answers below. Correct choices are highlighted in green and incorrect selections in red.
            </p>
          </div>
        )}

        {/* Questions Form / Review List */}
        {session && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              {session.questions.map((q, idx) => {
                const review = reviewMap.get(q.id);
                const selectedOptId = review ? review.selectedOptionId : selectedAnswers[q.id];

                return (
                  <div
                    key={q.id}
                    className={`rounded-[var(--radius-card)] border bg-surface shadow-card p-6 space-y-4 transition ${
                      review
                        ? review.correct
                          ? 'border-status-success-border'
                          : 'border-status-danger-border'
                        : 'border-border'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start gap-x-4">
                      <span className="inline-flex items-center gap-x-2 text-sm font-bold text-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        Question {idx + 1}
                      </span>

                      {/* Review Badge if submitted */}
                      {review ? (
                        <span
                          className={`inline-flex items-center gap-x-1 rounded-md px-2.5 py-1 text-xs font-bold border ${
                            review.correct
                              ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                              : 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                          }`}
                        >
                          {review.correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">{q.marks} Mark(s)</span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-semibold text-foreground/90 pl-8 whitespace-pre-wrap">
                      {q.text}
                    </p>

                    {/* Options List */}
                    <div className="pl-8 pt-1 space-y-2.5 max-w-lg">
                      {q.options.map((o) => {
                        const isSelected = selectedOptId === o.id;
                        const isCorrectOption = review && review.correctOptionId === o.id;
                        const isUserWrongSelection = review && isSelected && !review.correct;

                        let optionStyle = 'border-border bg-surface text-foreground hover:bg-surface-hover/50';

                        if (review) {
                          if (isCorrectOption) {
                            optionStyle = 'border-status-success-border bg-status-success-bg text-status-success-text font-semibold ring-1 ring-status-success-border';
                          } else if (isUserWrongSelection) {
                            optionStyle = 'border-status-danger-border bg-status-danger-bg text-status-danger-text font-semibold ring-1 ring-status-danger-border';
                          } else {
                            optionStyle = 'border-border/60 bg-surface text-muted-foreground/50 opacity-60';
                          }
                        } else if (isSelected) {
                          optionStyle = 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30';
                        }

                        return (
                          <label
                            key={o.id}
                            onClick={() => handleOptionSelect(q.id, o.id)}
                            className={`flex items-center justify-between text-xs font-medium p-3.5 rounded-xl border transition-all ${
                              submissionResult ? 'cursor-default' : 'cursor-pointer'
                            } ${optionStyle}`}
                          >
                            <div className="flex items-center gap-x-3">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={Boolean(isSelected)}
                                onChange={() => handleOptionSelect(q.id, o.id)}
                                disabled={Boolean(submissionResult)}
                                className="h-4 w-4 text-primary border-border bg-surface focus:ring-primary disabled:opacity-50"
                              />
                              <span>{o.text}</span>
                            </div>

                            {/* Status Indicator Icon in Review Mode */}
                            {review && (
                              <div>
                                {isCorrectOption && (
                                  <span className="text-status-success-text font-bold text-xs">✓ Correct Answer</span>
                                )}
                                {isUserWrongSelection && (
                                  <span className="text-status-danger-text font-bold text-xs">Your Choice</span>
                                )}
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            {!submissionResult ? (
              <div className="flex items-center justify-between border-t border-border pt-6">
                <span className="text-xs text-muted-foreground font-medium">
                  Select your answers above and click submit when ready.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin text-primary-foreground"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scoring Your Practice...
                    </>
                  ) : (
                    'Submit Practice Session'
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end border-t border-border pt-6 gap-x-4">
                {user && (
                  <Link
                    href={`/students/${user.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
                  >
                    Return to Profile
                  </Link>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
