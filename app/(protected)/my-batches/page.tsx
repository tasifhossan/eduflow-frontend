'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface EnrolledBatch {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  subject: {
    id?: string;
    name: string;
  };
  teacher?: {
    id?: string;
    name: string;
  } | null;
}

export default function MyBatchesListPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<EnrolledBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'STUDENT') {
        router.push('/dashboard');
        return;
      }
      loadMyBatches(user.id);
    }
    init();

    async function loadMyBatches(userId: string) {
      try {
        setLoading(true);
        setErrorMsg(null);

        const response = await apiGet<{ success: boolean; data: EnrolledBatch[] }>(
          `/api/students/${userId}/batches`
        );

        if (response && response.success && response.data) {
          setBatches(response.data);
        } else {
          setErrorMsg('Failed to load your enrolled batches');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while fetching your batches');
      } finally {
        setLoading(false);
      }
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading your batches...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <nav className="flex text-sm text-gray-500 gap-x-2 mb-1">
          <Link href="/dashboard" className="hover:text-primary font-medium">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">My Batches</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Enrolled Batches</h1>
        <p className="mt-1 text-sm text-gray-500">View details, schedules, and active tests for your enrolled courses</p>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600">
            <span className="font-semibold text-red-800">Error:</span> {errorMsg}
          </p>
        </div>
      )}

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center shadow-card">
          <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="mt-4 text-base font-semibold text-foreground">No active batch enrollments</p>
          <p className="text-sm text-muted-foreground mt-1">You are not currently enrolled in any active academic or admission batches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card flex flex-col justify-between hover:border-primary/50 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-x-2 mb-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      batch.type === 'ACADEMIC'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20'
                    }`}
                  >
                    {batch.type}
                  </span>
                  {batch.classLevel && (
                    <span className="text-xs text-muted-foreground bg-surface-hover border border-border px-2 py-0.5 rounded-md font-medium">
                      {batch.classLevel}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 truncate" title={batch.name}>
                  {batch.name}
                </h3>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-6">
                  <p className="flex items-center gap-x-2">
                    <span className="font-semibold text-foreground">Subject:</span>
                    <span>{batch.subject?.name || 'N/A'}</span>
                  </p>
                  <p className="flex items-center gap-x-2">
                    <span className="font-semibold text-foreground">Teacher:</span>
                    <span>{batch.teacher?.name || 'Unassigned'}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Link
                  href={`/my-batches/${batch.id}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
                >
                  View Details & Routine →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
