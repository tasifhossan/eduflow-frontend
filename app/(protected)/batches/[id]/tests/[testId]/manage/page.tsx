'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

interface BatchDetails {
  id: string;
  name: string;
}

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
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

export default function TestQuestionsManagePage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId, testId } = use(params);

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Question Form States
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [type, setType] = useState<'MCQ' | 'WRITTEN'>('MCQ');
  const [marks, setMarks] = useState('');
  const [order, setOrder] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    async function loadTestAndBatch() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        await fetchTestDetails();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load test parameters');
      } finally {
        setLoading(false);
      }
    }

    loadTestAndBatch();
  }, [batchId, testId, router]);

  const fetchTestDetails = async () => {
    const testRes = await apiGet<{ success: boolean; data: TestDetails }>(`/api/tests/${testId}`);
    if (testRes.success) {
      setTest(testRes.data);
      // Auto-suggest next order index
      if (!editingQuestionId) {
        const nextOrder = testRes.data.questions.length > 0
          ? Math.max(...testRes.data.questions.map((q) => q.order)) + 1
          : 1;
        setOrder(String(nextOrder));
      }
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionTextChange = (index: number, val: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text: val } : opt))
    );
  };

  const handleMarkCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }))
    );
  };

  const resetForm = () => {
    setEditingQuestionId(null);
    setText('');
    setType('MCQ');
    setMarks('');
    const nextOrder = test?.questions && test.questions.length > 0
      ? Math.max(...test.questions.map((q) => q.order)) + 1
      : 1;
    setOrder(String(nextOrder));
    setOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    setFormError(null);
  };

  const handleEditClick = (q: Question) => {
    setEditingQuestionId(q.id);
    setText(q.text);
    setType(q.type);
    setMarks(String(q.marks));
    setOrder(String(q.order));
    setOptions(
      q.options.length > 0
        ? q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
        : [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ]
    );
    setFormError(null);
    setSuccessMsg(null);
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiDelete<{ success: boolean; message?: string }>(`/api/questions/${qId}`);
      if (res && res.success) {
        setSuccessMsg('Question deleted successfully!');
        await fetchTestDetails();
        resetForm();
      } else {
        setErrorMsg(res.message || 'Failed to delete question');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while deleting the question');
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setSuccessMsg(null);

    if (text.trim().length < 3) {
      setFormError('Question text must be at least 3 characters long');
      return;
    }

    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum <= 0) {
      setFormError('Question marks must be a positive number');
      return;
    }

    const orderNum = Number(order);
    if (isNaN(orderNum)) {
      setFormError('Order must be a valid number');
      return;
    }

    // MCQ specific validations
    let cleanedOptions: Option[] = [];
    if (type === 'MCQ') {
      if (options.some((opt) => !opt.text.trim())) {
        setFormError('Please enter text for all options');
        return;
      }
      const correctOptsCount = options.filter((opt) => opt.isCorrect).length;
      if (correctOptsCount !== 1) {
        setFormError('Please mark exactly one option as correct');
        return;
      }
      cleanedOptions = options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
    }

    setIsSubmitting(true);

    try {
      const payload = {
        type,
        text: text.trim(),
        marks: marksNum,
        order: orderNum,
        options: type === 'MCQ' ? cleanedOptions : [],
      };

      let success = false;
      if (editingQuestionId) {
        const response = await apiPatch<{ success: boolean; message?: string }>(
          `/api/questions/${editingQuestionId}`,
          payload
        );
        success = !!response?.success;
      } else {
        const response = await apiPost<{ success: boolean; message?: string }>(
          `/api/tests/${testId}/questions`,
          payload
        );
        success = !!response?.success;
      }

      if (success) {
        setSuccessMsg(
          editingQuestionId ? 'Question updated successfully!' : 'Question added successfully!'
        );
        await fetchTestDetails();
        resetForm();
      } else {
        setFormError('Failed to save question');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the question');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading question builder...</span>
      </div>
    );
  }

  if (errorMsg || !test || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Builder</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Parameters not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to tests list
        </Link>
      </div>
    );
  }

  const runningMarksTotal = test.questions.reduce((sum, q) => sum + q.marks, 0);
  const isMarksMatching = runningMarksTotal === test.totalMarks;

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
          <span className="text-gray-900 font-semibold">{test.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{test.title}</h1>
            <p className="mt-2 text-sm text-gray-500">Design questions and choices for this cohort exam</p>
          </div>
          <div className="flex gap-x-3">
            <Link
              href={`/batches/${batchId}/tests/${testId}/results`}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              View Results
            </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Test Details & Question Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Test Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Exam Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400 font-medium">Format:</span> <span className="font-semibold text-gray-900">{test.type}</span></p>
                <p><span className="text-gray-400 font-medium">Target Marks:</span> <span className="font-semibold text-gray-900">{test.totalMarks} Marks</span></p>
                <p><span className="text-gray-400 font-medium">MCQ Penalty:</span> <span className="font-semibold text-red-600">-{test.negativeMarkingValue} per error</span></p>
                <p>
                  <span className="text-gray-400 font-medium">Duration:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {test.durationMinutes ? `${test.durationMinutes} mins` : 'Untimed'}
                  </span>
                </p>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
                {editingQuestionId ? 'Edit Question' : 'Add Question'}
              </h2>

              {formError && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-600">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                {/* Text */}
                <div>
                  <label htmlFor="qText" className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Question Text
                  </label>
                  <textarea
                    id="qText"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. Solve the equation 3x - 7 = 11"
                    rows={3}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="qType" className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Question Format
                  </label>
                  <select
                    id="qType"
                    value={type}
                    disabled={!!editingQuestionId} // Format should not change during edit for database constraint safety
                    onChange={(e) => setType(e.target.value as any)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                    required
                  >
                    <option value="MCQ">MCQ (Multiple Choice Options)</option>
                    <option value="WRITTEN">Written / Subjective response</option>
                  </select>
                </div>

                {/* Marks & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="qMarks" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Marks Value
                    </label>
                    <input
                      type="number"
                      id="qMarks"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      placeholder="e.g. 5"
                      min="1"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="qOrder" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Display Order
                    </label>
                    <input
                      type="number"
                      id="qOrder"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      placeholder="e.g. 1"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                      required
                    />
                  </div>
                </div>

                {/* MCQ Options Config */}
                {type === 'MCQ' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-semibold text-gray-600">Configure MCQ Options</span>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-[11px] font-bold text-accent hover:underline"
                      >
                        + Add Choice
                      </button>
                    </div>

                    <div className="space-y-2">
                      {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-x-2">
                          <input
                            type="radio"
                            name="correctOptionRadio"
                            checked={opt.isCorrect}
                            onChange={() => handleMarkCorrect(i)}
                            title="Mark as correct answer"
                            className="h-4 w-4 text-accent focus:ring-accent border-gray-300"
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleOptionTextChange(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-xs"
                            required
                          />
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(i)}
                              className="text-red-500 hover:text-red-700 font-semibold text-xs px-1"
                              title="Delete option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit actions */}
                <div className="flex gap-x-3 pt-4">
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-1/2 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition ${
                      editingQuestionId ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : editingQuestionId
                      ? 'Save Changes'
                      : 'Add Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Running Marks & Question List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Marks status check banner */}
            <div
              className={`rounded-2xl border p-5 flex items-center justify-between ${
                isMarksMatching
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div>
                <span className="block text-sm font-bold uppercase tracking-wider">Exam Marks Allocated</span>
                <p className="text-xs mt-0.5 font-medium opacity-90">
                  {isMarksMatching
                    ? '✓ Allocated questions marks match the target total marks exactly!'
                    : '⚠️ Total question marks must equal the target total marks of the exam.'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">
                  {runningMarksTotal} / {test.totalMarks}
                </span>
                <span className="block text-[10px] font-semibold opacity-70">marks distributed</span>
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                Exam Paper Questions ({test.questions.length})
              </h3>

              {test.questions.length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic text-sm">
                  No questions added to this test yet. Use the question builder panel to add MCQ or written items.
                </div>
              ) : (
                <div className="space-y-6">
                  {test.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-gray-200 p-5 bg-gray-50/20 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row justify-between gap-y-4"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-x-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            Order {q.order} — {q.type === 'MCQ' ? 'MCQ Choice Item' : 'Subjective Essay'}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                            {q.marks} Marks
                          </span>
                        </div>

                        <p className="text-sm text-gray-800 font-medium whitespace-pre-wrap pl-8">
                          {q.text}
                        </p>

                        {/* MCQ Options Display */}
                        {q.type === 'MCQ' && q.options.length > 0 && (
                          <div className="pl-8 space-y-1.5">
                            {q.options.map((o, optIdx) => (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-x-2.5 text-xs font-medium py-1 px-2.5 rounded-lg border max-w-md ${
                                  o.isCorrect
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-white border-gray-200 text-gray-600'
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    o.isCorrect ? 'bg-green-600' : 'bg-gray-300'
                                  }`}
                                />
                                <span className="flex-1">{o.text}</span>
                                {o.isCorrect && (
                                  <span className="text-[10px] uppercase font-bold text-green-700 tracking-wider">
                                    Correct answer
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Row Actions */}
                      <div className="flex md:flex-col justify-end items-end gap-2 pl-4 self-start">
                        <button
                          type="button"
                          onClick={() => handleEditClick(q)}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          Edit Question
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="inline-flex items-center justify-center rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100/70 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
