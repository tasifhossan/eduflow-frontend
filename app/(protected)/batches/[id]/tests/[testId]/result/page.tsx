'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

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
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'STUDENT') {
          // Redirect staff to tests lists
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

    async function loadResultData() {
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

    loadResultData();
  }, [batchId, testId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
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
        <Link href={`/batches/${batchId}/tests`} className="text-accent hover:underline text-sm font-medium">
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
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-accent font-medium">Tests</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{result.test.title} Result</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Exam Performance</h1>
            <p className="mt-2 text-sm text-gray-500">Graded report card for {result.test.title}</p>
          </div>
          <Link
            href={`/batches/${batchId}/tests`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Back to Tests
          </Link>
        </div>

        {/* Score Summary Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Score Obtained</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-extrabold text-accent">{result.totalMarksObtained}</span>
              <span className="text-sm text-gray-400 font-medium">/ {result.test.totalMarks} Marks</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Class Rank</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-extrabold text-gray-900">
                {result.rank ? `#${result.rank}` : <span className="text-gray-400 italic text-xl">Pending</span>}
              </span>
              {result.rank && <span className="text-sm text-gray-400 font-medium">in batch</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Submitted At</span>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-xs font-semibold text-gray-700">
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
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Questions Review</h2>

          {answers.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4 bg-white border border-gray-200 rounded-2xl">
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
                  <div key={ans.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-x-4">
                      <span className="inline-flex items-center gap-x-2 text-sm font-semibold text-gray-900">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {idx + 1}
                        </span>
                        Question {idx + 1} ({q.type})
                      </span>
                      
                      <span className="text-xs font-bold">
                        {isGraded ? (
                          <span className={ans.marksAwarded! >= q.marks ? 'text-green-600' : ans.marksAwarded! > 0 ? 'text-amber-500' : 'text-red-500'}>
                            {ans.marksAwarded} / {q.marks} Marks
                          </span>
                        ) : (
                          <span className="text-amber-500 italic bg-amber-50 rounded-md px-2 py-0.5 border border-amber-200">
                            Pending grading
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap pl-8">
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
                              ? 'border-green-200 bg-green-50 text-green-700 font-bold'
                              : isSelectedOption
                              ? 'border-red-200 bg-red-50 text-red-700 font-bold'
                              : 'border-gray-200 bg-white text-gray-600';

                            return (
                              <div
                                key={o.id}
                                className={`flex items-center gap-x-3 text-xs p-3 rounded-lg border ${optionStyle}`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                    o.isCorrect ? 'bg-green-600' : isSelectedOption ? 'bg-red-600' : 'bg-gray-300'
                                  }`}
                                />
                                <span className="flex-1">{o.text}</span>
                                {o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-green-700">
                                    Correct Answer
                                  </span>
                                )}
                                {isSelectedOption && !o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-700">
                                    Your Choice (Wrong)
                                  </span>
                                )}
                                {isSelectedOption && o.isCorrect && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-green-700">
                                    Your Choice (Correct)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {!ans.selectedOptionId && (
                          <p className="text-xs text-gray-400 italic">
                            ⚠️ Question was left unanswered (0 marks).
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Written Details */
                      <div className="pl-8 space-y-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                          <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Your Written Response
                          </span>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {ans.writtenAnswerText || <span className="text-gray-400 italic">No answer submitted</span>}
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
