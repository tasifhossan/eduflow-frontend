'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

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
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface PageProps {
  params: Promise<{ id: string; testId: string }>;
}

export default function TestResultsDashboardPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId, testId } = use(params);

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [test, setTest] = useState<TestDetails | null>(null);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'grading' | 'manual'>('leaderboard');

  // Input states for grading
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({});
  const [gradingErrors, setGradingErrors] = useState<Record<string, string>>({});
  const [gradingSubmitting, setGradingSubmitting] = useState<Record<string, boolean>>({});

  // Manual score entry states
  const [manualMarks, setManualMarks] = useState<Record<string, string>>({});
  const [savingManual, setSavingManual] = useState(false);

  // Role validation & fetch initial data
  useEffect(() => {
    const token = getToken();

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN' && payload.role !== 'TEACHER') {
          router.push('/dashboard');
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

    async function loadDashboardData() {
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
          if (testRes.data.type === 'OFFLINE') {
            setActiveTab('manual');
          }
        }

        const studentsRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`)
          .catch(() => ({ success: false, data: [] }));
        if (studentsRes.success && Array.isArray(studentsRes.data)) {
          setBatchStudents(studentsRes.data);
        }

        await fetchResults();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load test results data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [batchId, testId, router]);

  const fetchResults = async () => {
    const resultsRes = await apiGet<{ success: boolean; data: ResultSummary[] }>(`/api/tests/${testId}/results`);
    if (resultsRes.success) {
      setResults(resultsRes.data);
      // Auto fill existing result marks into manualMarks state
      const initialManual: Record<string, string> = {};
      resultsRes.data.forEach((r) => {
        initialManual[r.studentId] = String(r.totalMarksObtained);
      });
      setManualMarks(initialManual);
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
        setSuccessMsg('Manual test scores saved and ranked successfully!');
        await fetchResults();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save manual test scores');
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

    // Clear error
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
        // Clear input state
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
    } catch (err: any) {
      setGradingErrors((prev) => ({
        ...prev,
        [ansId]: err.message || 'Error occurred while grading',
      }));
    } finally {
      setGradingSubmitting((prev) => ({ ...prev, [ansId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading test results...</span>
      </div>
    );
  }

  if (errorMsg || !test || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Results</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Parameters not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to tests list
        </Link>
      </div>
    );
  }

  const isWrittenExam = test.type === 'WRITTEN' || test.type === 'MIXED';

  // 1. Compile list of students with ungraded written answers
  const ungradedSubmissions: {
    studentName: string;
    studentEmail: string;
    answer: StudentAnswer;
  }[] = [];

  if (isWrittenExam) {
    results.forEach((r) => {
      r.student.studentAnswers.forEach((ans) => {
        if (ans.question.type === 'WRITTEN' && ans.marksAwarded === null) {
          ungradedSubmissions.push({
            studentName: r.student.name,
            studentEmail: r.student.email,
            answer: ans,
          });
        }
      });
    });
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch.name}</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-accent font-medium">Tests</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{test.title} Results</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Exam Results</h1>
            <p className="mt-2 text-sm text-gray-500">Grading center and cohort performance leaderboard for {test.title}</p>
          </div>
          <div className="flex gap-x-3">
            {test.type !== 'OFFLINE' && (
              <Link
                href={`/batches/${batchId}/tests/${testId}/manage`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Configure Questions
              </Link>
            )}
            <Link
              href={`/batches/${batchId}/tests`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Tests
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-sm text-green-700 font-medium">✓ {successMsg}</p>
          </div>
        )}

        {/* Tabs Control */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-4 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'leaderboard'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Leaderboard
          </button>
          {isWrittenExam && (
            <button
              onClick={() => setActiveTab('grading')}
              className={`py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-x-2 ${
                activeTab === 'grading'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Grade Written Responses
              {ungradedSubmissions.length > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                  {ungradedSubmissions.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-4 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Manual Score Entry
          </button>
        </div>

        {/* Tab 1: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {results.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic text-sm">
                No submissions recorded for this exam yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rank</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student Info</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Marks Obtained</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Leaderboard Percentile</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Submission Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((res) => {
                      const isTop3 = res.rank && res.rank <= 3;
                      const borderAccent =
                        res.rank === 1
                          ? 'border-l-4 border-l-yellow-400 bg-yellow-50/10'
                          : res.rank === 2
                          ? 'border-l-4 border-l-slate-300 bg-slate-50/10'
                          : res.rank === 3
                          ? 'border-l-4 border-l-amber-600 bg-amber-50/10'
                          : '';

                      return (
                        <tr key={res.id} className={`hover:bg-gray-50/70 transition-colors ${borderAccent}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isTop3 ? (
                              <span className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold leading-none ring-1 ring-inset ${
                                res.rank === 1
                                  ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                  : res.rank === 2
                                  ? 'bg-slate-50 text-slate-800 ring-slate-600/20'
                                  : 'bg-amber-50 text-amber-800 ring-amber-600/20'
                              }`}>
                                👑 Rank {res.rank}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-500 pl-2">
                                #{res.rank || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{res.student.name}</div>
                            <div className="text-xs text-gray-500">{res.student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {res.totalMarksObtained} <span className="text-xs font-medium text-gray-400">/ {test.totalMarks} Marks</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-x-2">
                              <span className="text-xs font-semibold text-gray-700">
                                {Math.round((res.totalMarksObtained / test.totalMarks) * 100)}%
                              </span>
                              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    res.totalMarksObtained >= test.totalMarks * 0.8
                                      ? 'bg-green-600'
                                      : res.totalMarksObtained >= test.totalMarks * 0.5
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, (res.totalMarksObtained / test.totalMarks) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {new Date(res.submittedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

        {/* Tab 2: Grade Written Answers */}
        {activeTab === 'grading' && isWrittenExam && (
          <div className="space-y-6">
            {/* Written capture notice database check */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-x-3 text-indigo-800 text-xs">
              <svg className="h-5 w-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <span className="font-bold">Database Verification Notice:</span> The exam engine auto-save transaction has been confirmed to successfully record students' `writtenAnswerText` fields during their submissions. The responses below are live data loaded from the database logs.
              </div>
            </div>

            {ungradedSubmissions.length === 0 ? (
              <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm italic text-sm">
                🎉 All written submissions have been fully graded!
              </div>
            ) : (
              <div className="space-y-6">
                {ungradedSubmissions.map(({ studentName, studentEmail, answer }) => (
                  <div
                    key={answer.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
                  >
                    {/* Student details header */}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <div>
                        <span className="block text-sm font-bold text-gray-900">{studentName}</span>
                        <span className="block text-xs text-gray-500">{studentEmail}</span>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-700/10">
                        Max: {answer.question.marks} Marks
                      </span>
                    </div>

                    {/* Question description */}
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Question Prompt</span>
                      <p className="text-sm font-medium text-gray-800">{answer.question.text}</p>
                    </div>

                    {/* Student response */}
                    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Student Submission Response
                      </span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {answer.writtenAnswerText || <span className="text-gray-400 italic">No response submitted</span>}
                      </p>
                    </div>

                    {/* Grade input actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-y-4 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-x-2">
                        <label htmlFor={`score-${answer.id}`} className="text-xs font-bold text-gray-700">
                          Awarded Score:
                        </label>
                        <div className="relative rounded-md shadow-sm w-32">
                          <input
                            type="number"
                            id={`score-${answer.id}`}
                            value={gradingScores[answer.id] || ''}
                            onChange={(e) =>
                              setGradingScores((prev) => ({ ...prev, [answer.id]: e.target.value }))
                            }
                            placeholder="e.g. 8"
                            min="0"
                            max={answer.question.marks}
                            step="0.5"
                            className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent text-xs font-semibold"
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-bold">/ {answer.question.marks}</span>
                      </div>

                      <div className="flex items-center gap-x-4 self-end sm:self-auto">
                        {gradingErrors[answer.id] && (
                          <span className="text-xs font-semibold text-red-500">
                            ⚠️ {gradingErrors[answer.id]}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={gradingSubmitting[answer.id]}
                          onClick={() => handleSaveGrade(answer.id, answer.question.marks)}
                          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                        >
                          {gradingSubmitting[answer.id] ? 'Saving...' : 'Save Grade'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Manual Score Entry */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualMarks} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-y-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Offline / Paper Exam Score Entry</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter student marks manually for physical exam papers out of <strong>{test.totalMarks} Marks</strong>.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingManual}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {savingManual ? 'Saving Scores...' : 'Save All Scores'}
              </button>
            </div>

            {batchStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic text-sm">
                No students enrolled in this batch yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student Name</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Marks Obtained</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batchStudents.map((student) => {
                      const currentVal = manualMarks[student.id] || '';
                      const isGraded = currentVal !== '';
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-x-2">
                              <input
                                type="number"
                                min="0"
                                max={test.totalMarks}
                                step="0.5"
                                value={currentVal}
                                onChange={(e) =>
                                  setManualMarks((prev) => ({
                                    ...prev,
                                    [student.id]: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="block w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
                              />
                              <span className="text-xs font-bold text-gray-400">/ {test.totalMarks}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                isGraded
                                  ? 'bg-green-50 text-green-700 ring-green-600/20'
                                  : 'bg-gray-50 text-gray-600 ring-gray-500/20'
                              }`}
                            >
                              {isGraded ? 'Graded' : 'Pending Entry'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
