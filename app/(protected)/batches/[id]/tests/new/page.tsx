'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useCenter } from '@/components/providers/center-provider';
import { centerDateTimeInputToUtc, getTimezoneDisplay, formatDateTime } from '@/lib/tz';

interface BatchDetails {
  id: string;
  name: string;
  subjectId: string;
}

interface Chapter {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NewTestPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);
  const { center } = useCenter();
  const centerTz = center?.timezone || 'Asia/Dhaka';

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE'>('MCQ');
  const [totalMarks, setTotalMarks] = useState('');
  const [negativeMarkingValue, setNegativeMarkingValue] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [testDate, setTestDate] = useState('');
  const [windowEndsAt, setWindowEndsAt] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // UI Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      loadBatchData();
    }

    async function loadBatchData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);

          // Fetch chapters for this batch's subject
          const chaptersRes = await apiGet<{ success: boolean; data: Chapter[] }>(
            `/api/chapters?subjectId=${batchRes.data.subjectId}`
          );
          if (chaptersRes.success) {
            setChapters(chaptersRes.data);
          }
        }
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Failed to load batch/chapters details');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);

    const marksNum = Number(totalMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      setErrorMsg('Total marks must be a positive number');
      return;
    }

    const negNum = Number(negativeMarkingValue);
    if (isNaN(negNum) || negNum < 0) {
      setErrorMsg('Negative marking penalty cannot be negative');
      return;
    }

    if (!testDate) {
      setErrorMsg('Test date and start time are required');
      return;
    }

    const testDateUtc = centerDateTimeInputToUtc(testDate, centerTz);
    if (!testDateUtc) {
      setErrorMsg('Please enter a valid test date and time');
      return;
    }

    let windowEndsAtUtc: string | null = null;
    if (windowEndsAt) {
      windowEndsAtUtc = centerDateTimeInputToUtc(windowEndsAt, centerTz);
      if (!windowEndsAtUtc) {
        setErrorMsg('Please enter a valid window end date and time');
        return;
      }
      if (new Date(windowEndsAtUtc) <= new Date(testDateUtc)) {
        setErrorMsg('Window end must be strictly after the test start date and time');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        type,
        batchId,
        totalMarks: marksNum,
        negativeMarkingValue: negNum,
        durationMinutes: durationMinutes.trim() ? Number(durationMinutes) : null,
        testDate: testDateUtc,
        windowEndsAt: windowEndsAtUtc,
        shuffleQuestions: type !== 'OFFLINE' ? shuffleQuestions : false,
        shuffleOptions: type === 'MCQ' || type === 'MIXED' ? shuffleOptions : false,
        chapterId: selectedChapterId || null,
      };

      const response = await apiPost<{ success: boolean; message?: string; data: { id: string } }>(
        '/api/tests',
        payload
      );

      if (response && response.success) {
        const createdTestId = response.data.id;

        if (type === 'OFFLINE') {
          const selectedDate = new Date(testDateUtc);
          const now = new Date();
          if (selectedDate <= now) {
            router.push(`/batches/${batchId}/tests/${createdTestId}/results`);
          } else {
            router.push(`/batches/${batchId}/tests`);
          }
        } else {
          router.push(`/batches/${batchId}/tests/${createdTestId}/manage`);
        }
      } else {
        setErrorMsg(response.message || 'Failed to create test');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Plain language deadline rule preview
  const getDeadlineRulePreview = () => {
    if (!testDate) return null;
    const dur = durationMinutes.trim() ? Number(durationMinutes) : null;
    const testDateUtc = centerDateTimeInputToUtc(testDate, centerTz);
    const windowEndsUtc = windowEndsAt ? centerDateTimeInputToUtc(windowEndsAt, centerTz) : null;

    if (!testDateUtc) return null;

    if (dur && dur > 0) {
      if (windowEndsUtc) {
        return `Students get ${dur} minutes from when they start, until ${formatDateTime(windowEndsUtc, centerTz)} (${getTimezoneDisplay(centerTz)}).`;
      }
      return `Fixed-time exam: Students get ${dur} minutes starting at ${formatDateTime(testDateUtc, centerTz)} (${getTimezoneDisplay(centerTz)}).`;
    }

    if (windowEndsUtc) {
      return `Flexible window exam (untimed): Open from ${formatDateTime(testDateUtc, centerTz)} until ${formatDateTime(windowEndsUtc, centerTz)} (${getTimezoneDisplay(centerTz)}).`;
    }

    return `Fixed-time exam starting at ${formatDateTime(testDateUtc, centerTz)} (${getTimezoneDisplay(centerTz)}).`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading details...</span>
      </div>
    );
  }

  if (errorMsg && !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
          <h3 className="text-sm font-semibold text-status-danger-text">Error Loading Batch</h3>
          <p className="text-sm text-status-danger-text mt-1">{errorMsg}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  const deadlinePreview = getDeadlineRulePreview();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch?.name}</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-primary font-medium">Tests</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">New Test</span>
        </nav>

        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Test</h1>
          <p className="mt-2 text-sm text-muted-foreground">Configure a new exam cohort for {batch?.name}</p>
        </div>

        {errorMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
            <p className="text-sm text-status-danger-text">
              <span className="font-semibold">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Test Title */}
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-2">
                Test Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 3: Quadratic Equations Quiz"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                required
              />
            </div>

            {/* Test Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-foreground mb-2">
                Exam Format
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as 'MCQ' | 'WRITTEN' | 'MIXED' | 'OFFLINE')}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                required
              >
                <option value="MCQ">MCQ (Multiple Choice Questions)</option>
                <option value="WRITTEN">Written Subjective Exam</option>
                <option value="MIXED">Mixed Format</option>
                <option value="OFFLINE">Offline / Physical Exam (Manual Entry)</option>
              </select>
            </div>

            {/* Total Marks */}
            <div>
              <label htmlFor="totalMarks" className="block text-sm font-semibold text-foreground mb-2">
                Total Marks
              </label>
              <input
                type="number"
                id="totalMarks"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 50"
                min="1"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                required
              />
            </div>

            {/* Test Start Date and Time (Center Timezone) */}
            <div>
              <label htmlFor="testDate" className="block text-sm font-semibold text-foreground mb-2">
                Start Date & Time ({getTimezoneDisplay(centerTz)})
              </label>
              <input
                type="datetime-local"
                id="testDate"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm font-medium"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                When students are first allowed to start this exam.
              </p>
            </div>

            {/* Window Ends At (Center Timezone) */}
            <div>
              <label htmlFor="windowEndsAt" className="block text-sm font-semibold text-foreground mb-2">
                Window End Time (Optional)
              </label>
              <input
                type="datetime-local"
                id="windowEndsAt"
                value={windowEndsAt}
                onChange={(e) => setWindowEndsAt(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm font-medium"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty for a strict fixed-time exam.
              </p>
            </div>

            {/* Timing Mode Explanations & Live Deadline Rule */}
            <div className="sm:col-span-2 rounded-[var(--radius-card)] bg-surface-hover/40 border border-border p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Exam Timing Rules
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>
                  <strong className="text-foreground">Fixed-Time Mode:</strong> The exam starts at the scheduled time and ends strictly after the duration (or test date + duration).
                </li>
                <li>
                  <strong className="text-foreground">Flexible Window Mode:</strong> Students can start anytime between the test date and window end; each gets their full duration up to the window end.
                </li>
              </ul>
              {deadlinePreview && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-primary">Live Rule: </span>
                  <span className="text-xs font-medium text-foreground">{deadlinePreview}</span>
                </div>
              )}
            </div>

            {/* Duration (Minutes) */}
            <div>
              <label htmlFor="durationMinutes" className="block text-sm font-semibold text-foreground mb-2">
                Duration (Minutes, Optional)
              </label>
              <input
                type="number"
                id="durationMinutes"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 60"
                min="1"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            {/* Negative Marking Value */}
            <div>
              <label htmlFor="negativeMarking" className="block text-sm font-semibold text-foreground mb-2">
                Negative Marking Penalty
              </label>
              <input
                type="number"
                id="negativeMarking"
                value={negativeMarkingValue}
                onChange={(e) => setNegativeMarkingValue(e.target.value)}
                placeholder="e.g. 0.25"
                min="0"
                step="0.01"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Penalty marks deducted per incorrect MCQ response (e.g. 0.25). Set 0 for no penalty.
              </p>
            </div>

            {/* Chapter Selection */}
            <div className="sm:col-span-2">
              <label htmlFor="chapterId" className="block text-sm font-semibold text-foreground mb-2">
                Chapter Classification (Optional)
              </label>
              <select
                id="chapterId"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm font-medium"
              >
                <option value="">Select a chapter (None)</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shuffling Options (Online Only) */}
            {type !== 'OFFLINE' && (
              <div className="sm:col-span-2 border-t border-border pt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security & Anti-Cheating
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">Shuffle Questions</span>
                  </label>
                  {(type === 'MCQ' || type === 'MIXED') && (
                    <label className="flex items-center gap-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shuffleOptions}
                        onChange={(e) => setShuffleOptions(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-foreground">Shuffle Answer Options</span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, questions and options are randomized deterministically per student attempt.
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-4 border-t border-border pt-6">
            <Link
              href={`/batches/${batchId}/tests`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create & Add Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
