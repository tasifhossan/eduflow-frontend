'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

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

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'MCQ' | 'WRITTEN' | 'MIXED'>('MCQ');
  const [totalMarks, setTotalMarks] = useState('');
  const [negativeMarkingValue, setNegativeMarkingValue] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [testDate, setTestDate] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // UI Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role validation & fetch initial data
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

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
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load batch/chapters details');
      } finally {
        setLoading(false);
      }
    }

    loadBatchData();
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
      setErrorMsg('Negative marking value cannot be negative');
      return;
    }

    if (!testDate) {
      setErrorMsg('Test date is required');
      return;
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
        // Set test date to the selected date at midnight UTC
        testDate: new Date(testDate).toISOString(),
        chapterId: selectedChapterId || null,
      };

      const response = await apiPost<{ success: boolean; message?: string; data: { id: string } }>(
        '/api/tests',
        payload
      );

      if (response && response.success) {
        router.push(`/batches/${batchId}/tests/${response.data.id}/manage`);
      } else {
        setErrorMsg(response.message || 'Failed to create test');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading details...</span>
      </div>
    );
  }

  if (errorMsg && !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Batch</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch?.name}</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}/tests`} className="hover:text-accent font-medium">Tests</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">New Test</span>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Test</h1>
          <p className="mt-2 text-sm text-gray-500">Configure a new exam cohort for {batch?.name}</p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Test Title */}
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                Test Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 3: Quadratic Equations Quiz"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Test Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-gray-900 mb-2">
                Exam Format
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              >
                <option value="MCQ">MCQ (Multiple Choice Questions)</option>
                <option value="WRITTEN">Written Subjective Exam</option>
                <option value="MIXED">Mixed Format</option>
              </select>
            </div>

            {/* Test Date */}
            <div>
              <label htmlFor="testDate" className="block text-sm font-semibold text-gray-900 mb-2">
                Test Date
              </label>
              <input
                type="date"
                id="testDate"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm font-medium"
                required
              />
            </div>

            {/* Total Marks */}
            <div>
              <label htmlFor="totalMarks" className="block text-sm font-semibold text-gray-900 mb-2">
                Total Marks
              </label>
              <input
                type="number"
                id="totalMarks"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 50"
                min="1"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Duration (Minutes) */}
            <div>
              <label htmlFor="durationMinutes" className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (Minutes, Optional)
              </label>
              <input
                type="number"
                id="durationMinutes"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 30"
                min="1"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              />
            </div>

            {/* Negative Marking Value */}
            <div>
              <label htmlFor="negativeMarking" className="block text-sm font-semibold text-gray-900 mb-2">
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
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Penalty marks deducted per incorrect MCQ response (e.g. 0.25). Set 0 for no penalty.
              </p>
            </div>

            {/* Chapter Selection */}
            <div className="sm:col-span-2">
              <label htmlFor="chapterId" className="block text-sm font-semibold text-gray-900 mb-2">
                Chapter Classification (Optional)
              </label>
              <select
                id="chapterId"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm font-medium"
              >
                <option value="">Select a chapter (None)</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-4 border-t border-gray-100 pt-6">
            <Link
              href={`/batches/${batchId}/tests`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create & Add Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
