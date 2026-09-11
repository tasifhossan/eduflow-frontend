'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient, UserClaims } from '@/lib/client-auth';

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
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load practice session.');
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
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during practice submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <span className="ml-3 text-lg font-medium text-gray-600">Preparing practice session...</span>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl bg-red-50 p-6 border border-red-200">
          <h3 className="text-base font-bold text-red-800">Error Loading Practice Session</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
        </div>
        {user && (
          <Link
            href={`/students/${user.id}`}
            className="inline-block text-indigo-600 hover:underline text-sm font-semibold"
          >
            ← Back to My Profile
          </Link>
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
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <nav className="flex text-sm text-gray-500 gap-x-2">
            {user && (
              <Link href={`/students/${user.id}`} className="hover:text-indigo-600 font-medium">
                My Profile
              </Link>
            )}
            <span>/</span>
            <span className="text-gray-900 font-semibold">Practice Session</span>
          </nav>
          {user && (
            <Link
              href={`/students/${user.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Profile
            </Link>
          )}
        </div>

        {/* Practice Session Header */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-x-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                  🎯 Targeted Practice
                </span>
                <span className="text-xs text-indigo-200">({session?.totalQuestions} Questions)</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight font-poppins">Weak Chapters Practice</h1>
              <p className="text-xs text-indigo-200 mt-1">
                Practice mode does not write to formal test results or affect class ranks.
              </p>
            </div>

            {submissionResult && (
              <div className="flex items-center gap-x-3 bg-white/10 rounded-xl p-3 border border-white/20 backdrop-blur-sm">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block tracking-wider">
                    Score Achieved
                  </span>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {submissionResult.score}%
                  </span>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block tracking-wider">
                    Correct
                  </span>
                  <span className="text-sm font-bold text-white">
                    {submissionResult.correctAnswers} / {submissionResult.totalQuestions}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-600">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}

        {/* Submission Results Summary Card */}
        {submissionResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-x-2">
                <span>🎉 Practice Completed!</span>
              </h2>
              <span className="text-xs font-semibold text-emerald-700">
                Submitted on {new Date(submissionResult.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-emerald-800">
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
                    className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition ${
                      review
                        ? review.correct
                          ? 'border-emerald-200'
                          : 'border-rose-200'
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start gap-x-4">
                      <span className="inline-flex items-center gap-x-2 text-sm font-bold text-gray-900">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {idx + 1}
                        </span>
                        Question {idx + 1}
                      </span>

                      {/* Review Badge if submitted */}
                      {review ? (
                        <span
                          className={`inline-flex items-center gap-x-1 rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                            review.correct
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                          }`}
                        >
                          {review.correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">{q.marks} Mark(s)</span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-semibold text-gray-800 pl-8 whitespace-pre-wrap">
                      {q.text}
                    </p>

                    {/* Options List */}
                    <div className="pl-8 pt-1 space-y-2.5 max-w-lg">
                      {q.options.map((o) => {
                        const isSelected = selectedOptId === o.id;
                        const isCorrectOption = review && review.correctOptionId === o.id;
                        const isUserWrongSelection = review && isSelected && !review.correct;

                        let optionStyle = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';

                        if (review) {
                          if (isCorrectOption) {
                            optionStyle = 'border-emerald-500 bg-emerald-50/90 text-emerald-900 font-semibold ring-1 ring-emerald-500';
                          } else if (isUserWrongSelection) {
                            optionStyle = 'border-rose-500 bg-rose-50/90 text-rose-900 font-semibold ring-1 ring-rose-500';
                          } else {
                            optionStyle = 'border-gray-100 bg-gray-50 text-gray-400 opacity-70';
                          }
                        } else if (isSelected) {
                          optionStyle = 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold ring-1 ring-indigo-600';
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
                                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <span>{o.text}</span>
                            </div>

                            {/* Status Indicator Icon in Review Mode */}
                            {review && (
                              <div>
                                {isCorrectOption && (
                                  <span className="text-emerald-600 font-bold text-xs">✓ Correct Answer</span>
                                )}
                                {isUserWrongSelection && (
                                  <span className="text-rose-600 font-bold text-xs">Your Choice</span>
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
              <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                <span className="text-xs text-gray-500 font-medium">
                  Select your answers above and click submit when ready.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin text-white"
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
              <div className="flex items-center justify-end border-t border-gray-200 pt-6 gap-x-4">
                {user && (
                  <Link
                    href={`/students/${user.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition"
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
