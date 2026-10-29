'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

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
  windowEndsAt?: string | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  chapterId?: string | null;
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

  // Lock status (attempts exist)
  const [hasAttempts, setHasAttempts] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [isDuplicating, setIsDuplicating] = useState(false);

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

  const fetchTestDetails = useCallback(async () => {
    const testRes = await apiGet<{ success: boolean; data: TestDetails }>(`/api/tests/${testId}`);
    if (testRes.success) {
      setTest(testRes.data);
      if (!editingQuestionId) {
        const nextOrder = testRes.data.questions.length > 0
          ? Math.max(...testRes.data.questions.map((q) => q.order)) + 1
          : 1;
        setOrder(String(nextOrder));
      }
    }
  }, [testId, editingQuestionId]);

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
      loadTestDetails();
    }

    async function loadTestDetails() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        await fetchTestDetails();

        // Check if student attempts exist
        try {
          const attemptsRes = await apiGet<{ success: boolean; data: { attempts: unknown[] } }>(
            `/api/tests/${testId}/attempts`
          );
          if (attemptsRes.success && Array.isArray(attemptsRes.data.attempts)) {
            const count = attemptsRes.data.attempts.length;
            setHasAttempts(count > 0);
            setAttemptsCount(count);
          }
        } catch {
          // Ignore attempt check failure if non-staff or not available
        }
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Failed to load test parameters');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, testId, router, fetchTestDetails]);

  const handleDuplicateTest = async () => {
    if (!test || isDuplicating) return;

    setIsDuplicating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Create duplicate test header
      const createPayload = {
        title: `${test.title} (Copy)`,
        type: test.type,
        batchId: test.batchId,
        chapterId: test.chapterId || null,
        totalMarks: test.totalMarks,
        negativeMarkingValue: test.negativeMarkingValue,
        durationMinutes: test.durationMinutes || null,
        testDate: new Date().toISOString(),
        windowEndsAt: test.windowEndsAt || null,
        shuffleQuestions: !!test.shuffleQuestions,
        shuffleOptions: !!test.shuffleOptions,
      };

      const createRes = await apiPost<{ success: boolean; data: { id: string }; message?: string }>(
        '/api/tests',
        createPayload
      );

      if (!createRes.success || !createRes.data?.id) {
        throw new Error(createRes.message || 'Failed to clone test');
      }

      const newTestId = createRes.data.id;

      // 2. Clone questions if existing test has any
      if (test.questions && test.questions.length > 0) {
        const bulkPayload = test.questions.map((q) => ({
          type: q.type,
          text: q.text,
          marks: q.marks,
          order: q.order,
          options: q.type === 'MCQ'
            ? q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
            : [],
        }));

        await apiPost(`/api/tests/${newTestId}/questions/bulk`, bulkPayload);
      }

      router.push(`/batches/${batchId}/tests/${newTestId}/manage`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to duplicate test');
    } finally {
      setIsDuplicating(false);
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
    if (hasAttempts) return;
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
    if (hasAttempts) return;
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
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred while deleting the question');
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasAttempts) return;

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
    } catch (err: unknown) {
      setFormError((err as Error).message || 'An error occurred while saving the question');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading question builder...</span>
      </div>
    );
  }

  if (errorMsg || !test || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
          <h3 className="text-sm font-semibold text-status-danger-text">Error Loading Builder</h3>
          <p className="text-sm text-status-danger-text mt-1">{errorMsg || 'Parameters not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}/tests`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
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
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch.name}</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-primary font-medium">Tests</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{test.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{test.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Design questions and choices for this cohort exam</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {hasAttempts && (
              <button
                type="button"
                onClick={handleDuplicateTest}
                disabled={isDuplicating}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover shadow-sm transition disabled:opacity-50"
              >
                {isDuplicating ? 'Duplicating...' : 'Duplicate Test'}
              </button>
            )}
            <Link
              href={`/batches/${batchId}/tests/${testId}/results`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
            >
              View Results
            </Link>
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

        {/* Locked Exam Notice Banner when attempts exist */}
        {hasAttempts && (
          <div className="rounded-[var(--radius-card)] bg-status-warning-bg p-5 border border-status-warning-border space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-status-warning-text flex items-center gap-x-2">
                <span>🔒</span> Exam Locked — {attemptsCount} Active/Completed Attempt{attemptsCount === 1 ? '' : 's'}
              </h3>
              <button
                type="button"
                onClick={handleDuplicateTest}
                disabled={isDuplicating}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition disabled:opacity-50"
              >
                {isDuplicating ? 'Duplicating...' : 'Duplicate Test to Edit'}
              </button>
            </div>
            <p className="text-xs text-status-warning-text leading-relaxed">
              Questions, marks, and answer options are locked because students have already started or submitted attempts. Editing live questions would compromise grading integrity. To make changes, use &ldquo;Duplicate Test&rdquo; to create an editable copy with all existing questions.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Test Details & Question Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Test Summary Card */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">Exam Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground font-medium">Format:</span> <span className="font-semibold text-foreground">{test.type}</span></p>
                <p><span className="text-muted-foreground font-medium">Target Marks:</span> <span className="font-semibold text-foreground">{test.totalMarks} Marks</span></p>
                <p><span className="text-muted-foreground font-medium">MCQ Penalty:</span> <span className="font-semibold text-status-danger-text">-{test.negativeMarkingValue} per error</span></p>
                <p>
                  <span className="text-muted-foreground font-medium">Duration:</span>{' '}
                  <span className="font-semibold text-foreground">
                    {test.durationMinutes ? `${test.durationMinutes} mins` : 'Untimed'}
                  </span>
                </p>
              </div>
            </div>

            {/* Form Card or Locked Message */}
            {hasAttempts ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 text-center space-y-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-status-warning-bg text-status-warning-text text-xl">
                  🔒
                </span>
                <h3 className="text-sm font-semibold text-foreground">Question Editing Locked</h3>
                <p className="text-xs text-muted-foreground">
                  This exam has recorded student attempts. Questions cannot be added, edited, or deleted.
                </p>
                <button
                  type="button"
                  onClick={handleDuplicateTest}
                  disabled={isDuplicating}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition disabled:opacity-50"
                >
                  {isDuplicating ? 'Duplicating...' : 'Duplicate Test'}
                </button>
              </div>
            ) : (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
                <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">
                  {editingQuestionId ? 'Edit Question' : 'Add Question'}
                </h2>

                {formError && (
                  <div className="rounded-md bg-status-danger-bg p-3 border border-status-danger-border text-xs text-status-danger-text">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmitQuestion} className="space-y-4">
                  {/* Text */}
                  <div>
                    <label htmlFor="qText" className="block text-xs font-semibold text-foreground mb-1.5">
                      Question Text
                    </label>
                    <textarea
                      id="qText"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. Solve the equation 3x - 7 = 11"
                      rows={3}
                      className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label htmlFor="qType" className="block text-xs font-semibold text-foreground mb-1.5">
                      Question Format
                    </label>
                    <select
                      id="qType"
                      value={type}
                      disabled={!!editingQuestionId}
                      onChange={(e) => setType(e.target.value as 'MCQ' | 'WRITTEN')}
                      className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      required
                    >
                      <option value="MCQ">MCQ (Multiple Choice Options)</option>
                      <option value="WRITTEN">Written / Subjective response</option>
                    </select>
                  </div>

                  {/* Marks & Order */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="qMarks" className="block text-xs font-semibold text-foreground mb-1.5">
                        Marks Value
                      </label>
                      <input
                        type="number"
                        id="qMarks"
                        value={marks}
                        onChange={(e) => setMarks(e.target.value)}
                        placeholder="e.g. 5"
                        min="1"
                        className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="qOrder" className="block text-xs font-semibold text-foreground mb-1.5">
                        Display Order
                      </label>
                      <input
                        type="number"
                        id="qOrder"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                        placeholder="e.g. 1"
                        className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* MCQ Options Config */}
                  {type === 'MCQ' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-semibold text-foreground">Configure MCQ Options</span>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-[11px] font-bold text-primary hover:underline"
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
                              className="h-4 w-4 text-primary focus:ring-primary border-border bg-surface"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionTextChange(i, e.target.value)}
                              placeholder={`Option ${i + 1}`}
                              className="block w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                              required
                            />
                            {options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(i)}
                                className="text-status-danger-text hover:opacity-80 font-semibold text-xs px-1"
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
                        className="w-1/2 inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition ${
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
            )}
          </div>

          {/* Right Column: Running Marks & Question List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Marks status check banner */}
            <div
              className={`rounded-2xl border p-5 flex items-center justify-between ${
                isMarksMatching
                  ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                  : 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
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
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-6">
              <h3 className="text-lg font-bold text-foreground border-b border-border pb-3">
                Exam Paper Questions ({test.questions.length})
              </h3>

              {test.questions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  No questions added to this test yet. Use the question builder panel to add MCQ or written items.
                </div>
              ) : (
                <div className="space-y-6">
                  {test.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-border p-5 bg-surface-hover/30 hover:bg-surface-hover/60 transition-colors flex flex-col md:flex-row justify-between gap-y-4"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-x-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            Order {q.order} — {q.type === 'MCQ' ? 'MCQ Choice Item' : 'Subjective Essay'}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-surface-hover px-2 py-0.5 text-xs font-bold text-foreground border border-border">
                            {q.marks} Marks
                          </span>
                        </div>

                        <p className="text-sm text-foreground/90 font-medium whitespace-pre-wrap pl-8">
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
                                    ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                                    : 'bg-surface border-border text-foreground'
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    o.isCorrect ? 'bg-primary' : 'bg-muted-foreground/40'
                                  }`}
                                />
                                <span className="flex-1">{o.text}</span>
                                {o.isCorrect && (
                                  <span className="text-[10px] uppercase font-bold text-status-success-text tracking-wider">
                                    Correct answer
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Row Actions */}
                      {!hasAttempts && (
                        <div className="flex md:flex-col justify-end items-end gap-2 pl-4 self-start">
                          <button
                            type="button"
                            onClick={() => handleEditClick(q)}
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                          >
                            Edit Question
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="inline-flex items-center justify-center rounded-lg bg-status-danger-bg border border-status-danger-border px-3 py-1.5 text-xs font-semibold text-status-danger-text hover:opacity-80 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
