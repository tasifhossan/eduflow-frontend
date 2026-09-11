'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

interface BatchSummary {
  id: string;
  name: string;
  subject?: { name: string } | null;
}

interface PracticeWeakSpotCardProps {
  studentId: string;
  enrolledBatches: BatchSummary[];
}

export default function PracticeWeakSpotCard({
  studentId,
  enrolledBatches,
}: PracticeWeakSpotCardProps) {
  const router = useRouter();
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    enrolledBatches[0]?.id || ''
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartPractice = async () => {
    if (!selectedBatchId) {
      setErrorMsg('Please select a batch to practice.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Call POST /api/students/:studentId/practice-sessions with no chapterIds to auto-select weakest
      const response = await apiPost<{
        success: boolean;
        message: string;
        data: {
          sessionId: string;
          totalQuestions: number;
        };
      }>(`/api/students/${studentId}/practice-sessions`, {
        batchId: selectedBatchId,
      });

      if (response && response.success && response.data?.sessionId) {
        // Navigate to the practice session flow
        router.push(`/practice-sessions/${response.data.sessionId}`);
      } else {
        setErrorMsg('Failed to generate practice session.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating practice session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-x-2">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              🎯 Personalized Practice
            </span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-gray-900 font-poppins">
            Practice Your Weak Chapters
          </h3>
          <p className="text-sm text-gray-600">
            Generate an instant, auto-graded practice test focused on your lowest-scoring chapters.
            Practice attempts do not affect your formal class ranks or overall GPA.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-[240px]">
          {enrolledBatches.length > 1 && (
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              {enrolledBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject?.name || 'Subject'})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleStartPractice}
            disabled={loading || enrolledBatches.length === 0}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating Session...
              </>
            ) : (
              <>
                <span>Practice Weak Chapters</span>
                <span className="ml-2">→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl bg-red-50 p-3.5 border border-red-200">
          <p className="text-xs text-red-600 font-medium">
            <span className="font-bold">Unable to start session:</span> {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
