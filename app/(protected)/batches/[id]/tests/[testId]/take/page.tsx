'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

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

interface TestDetails {
  id: string;
  title: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED';
  totalMarks: number;
  negativeMarkingValue: number;
  durationMinutes?: number | null;
  testDate: string;
  batchId: string;
  questions: Question[];
}

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default function TakeTestPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId, testId } = use(params);

  // States
  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Answers State: maps questionId to selectedOptionId or writtenAnswerText
  const [studentAnswers, setStudentAnswers] = useState<Record<string, { selectedOptionId?: string | null; writtenAnswerText?: string | null }>>({});

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const isAutoSubmitting = useRef(false);

  // Validate student role & check prior submission
  useEffect(() => {
    const token = getToken();

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'STUDENT') {
          // Redirect staff away from the exam submission workspace
          router.push(`/batches/${batchId}/tests`);
          return;
        }
      } catch (err) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    async function checkSubmissionAndLoadTest() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Check if student already submitted this test
        try {
          const checkRes = await apiGet<{ success: boolean }>(`/api/tests/${testId}/my-result`);
          if (checkRes && checkRes.success) {
            // Already submitted, redirect to result page
            router.push(`/batches/${batchId}/tests/${testId}/result`);
            return;
          }
        } catch (err) {
          // Result not found means student hasn't taken it yet, proceed!
        }

        // 2. Fetch test details
        const testRes = await apiGet<{ success: boolean; data: TestDetails }>(`/api/tests/${testId}`);
        if (testRes.success) {
          setTest(testRes.data);
          // Set timer if durationMinutes is specified
          if (testRes.data.durationMinutes) {
            setSecondsLeft(testRes.data.durationMinutes * 60);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    }

    checkSubmissionAndLoadTest();
  }, [batchId, testId, router]);

  // Countdown timer hook
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      // Time limit reached, trigger auto-submit
      if (!isAutoSubmitting.current) {
        isAutoSubmitting.current = true;
        handleAutoSubmit();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleMCQChange = (qId: string, optId: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: { selectedOptionId: optId },
    }));
  };

  const handleWrittenChange = (qId: string, text: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: { writtenAnswerText: text },
    }));
  };

  const submitExamData = async (answersPayload: any[]) => {
    setIsSubmitting(true);
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        `/api/tests/${testId}/submit`,
        { answers: answersPayload }
      );

      if (response && response.success) {
        router.push(`/batches/${batchId}/tests/${testId}/result`);
      } else {
        setErrorMsg(response.message || 'Failed to submit exam');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission');
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    setErrorMsg('⏳ Time has expired! Submitting your answers automatically...');
    const payload = prepareAnswersPayload();
    await submitExamData(payload);
  };

  const prepareAnswersPayload = () => {
    if (!test) return [];
    return test.questions.map((q) => {
      const ansObj = studentAnswers[q.id];
      return {
        questionId: q.id,
        selectedOptionId: ansObj?.selectedOptionId || null,
        writtenAnswerText: ansObj?.writtenAnswerText || null,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const confirmSubmit = window.confirm(
      'Are you sure? You cannot change answers after submitting.'
    );
    if (!confirmSubmit) return;

    const payload = prepareAnswersPayload();
    await submitExamData(payload);
  };

  const formatTimer = () => {
    if (secondsLeft === null) return '';
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Preparing test paper...</span>
      </div>
    );
  }

  if (errorMsg && !test) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to tests list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header card with details and timer */}
        {test && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{test.title}</h1>
              <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500 mt-2 font-medium">
                <span className="bg-gray-100 rounded-md px-2 py-0.5">{test.type} Exam</span>
                <span>•</span>
                <span>Total: {test.totalMarks} Marks</span>
                {test.negativeMarkingValue > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-500 font-semibold">
                      Negative Marking: -{test.negativeMarkingValue} marks per MCQ error
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Timer component */}
            {secondsLeft !== null && (
              <div className="flex items-center gap-x-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 flex-shrink-0">
                <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="font-mono text-xl font-bold leading-none">{formatTimer()}</div>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {test && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Questions paper */}
            <div className="space-y-6">
              {test.questions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-start gap-x-4">
                    <span className="inline-flex items-center gap-x-2 text-sm font-semibold text-gray-900">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {idx + 1}
                      </span>
                      Question {idx + 1} ({q.type})
                    </span>
                    <span className="text-xs text-gray-400 font-bold">{q.marks} Marks</span>
                  </div>

                  <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap pl-8">
                    {q.text}
                  </p>

                  <div className="pl-8 pt-1">
                    {/* MCQ Options */}
                    {q.type === 'MCQ' ? (
                      <div className="space-y-2 max-w-lg">
                        {q.options.map((o) => {
                          const isSelected = studentAnswers[q.id]?.selectedOptionId === o.id;

                          return (
                            <label
                              key={o.id}
                              className={`flex items-center gap-x-3 text-xs font-medium p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                                isSelected
                                  ? 'border-accent bg-accent/5 text-accent'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={isSelected}
                                onChange={() => handleMCQChange(q.id, o.id)}
                                className="h-4 w-4 text-accent border-gray-300 focus:ring-accent"
                              />
                              <span>{o.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* Written Essay Textarea */
                      <textarea
                        value={studentAnswers[q.id]?.writtenAnswerText || ''}
                        onChange={(e) => handleWrittenChange(q.id, e.target.value)}
                        placeholder="Write your explanation here..."
                        rows={4}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Exam Panel */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <span className="text-xs text-gray-500 font-medium">
                Make sure you have reviewed all answers before submitting.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Submitting Answers...' : 'Submit Test'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
