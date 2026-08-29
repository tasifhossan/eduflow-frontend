'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';

interface StudentBatchDetails {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  feeType?: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

interface RoutineSlot {
  id: string;
  batchId: string;
  dayOfWeek: 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
  startTime: string;
  endTime: string;
}

export default function StudentBatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [batch, setBatch] = useState<StudentBatchDetails | null>(null);
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push('/login');
      return;
    }

    const payload = parseJwt(token);
    if (!payload || payload.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }

    async function loadBatchAndRoutine() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch student-safe batch view
        const batchRes = await apiGet<{ success: boolean; data: StudentBatchDetails }>(
          `/api/batches/${id}/student-view`
        );

        if (batchRes && batchRes.success && batchRes.data) {
          setBatch(batchRes.data);
        } else {
          setErrorMsg('Failed to load batch details or access denied.');
        }

        // Fetch routine for batch
        const routineRes = await apiGet<{ success: boolean; data: RoutineSlot[] }>(
          `/api/batches/${id}/routine`
        ).catch(() => ({ success: false, data: [] }));

        if (routineRes && routineRes.success && routineRes.data) {
          setRoutine(routineRes.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while loading batch information.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadBatchAndRoutine();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading batch details...</span>
      </div>
    );
  }

  if (errorMsg || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl bg-red-50 p-6 border border-red-200 text-center">
          <h2 className="text-lg font-bold text-red-800">Access Denied / Error</h2>
          <p className="text-sm text-red-600 mt-1">{errorMsg || 'Batch not found or you are not actively enrolled.'}</p>
          <Link
            href="/my-batches"
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 transition"
          >
            ← Back to My Batches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Navigation Header */}
      <div className="border-b border-gray-200 pb-5">
        <nav className="flex text-sm text-gray-500 gap-x-2 mb-2">
          <Link href="/dashboard" className="hover:text-accent font-medium">Dashboard</Link>
          <span>/</span>
          <Link href="/my-batches" className="hover:text-accent font-medium">My Batches</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{batch.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-x-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{batch.name}</h1>
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  batch.type === 'ACADEMIC'
                    ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    : 'bg-purple-50 text-purple-700 ring-purple-600/20'
                }`}
              >
                {batch.type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {batch.subject.name} {batch.classLevel ? `• ${batch.classLevel}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-x-3">
            <Link
              href={`/batches/${batch.id}/tests`}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 transition"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Tests & Submissions
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Subject</span>
          <p className="mt-2 text-xl font-bold text-gray-900">{batch.subject.name}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Assigned Teacher</span>
          <p className="mt-2 text-xl font-bold text-gray-900">{batch.teacher?.name || 'Unassigned'}</p>
          {batch.teacher?.email && (
            <p className="text-xs text-gray-500 mt-1">{batch.teacher.email}</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Class Level & Billing</span>
          <p className="mt-2 text-xl font-bold text-gray-900">{batch.classLevel || 'N/A'}</p>
          {batch.feeType && (
            <p className="text-xs text-gray-500 mt-1">Billing structure: {batch.feeType}</p>
          )}
        </div>
      </div>

      {/* Class Routine Section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden space-y-4 p-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Class Routine / Schedule</h2>
          <p className="text-xs text-gray-500 mt-0.5">Weekly class schedule for {batch.name}</p>
        </div>

        {routine.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">
            No class routine schedule published yet for this batch.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {routine.map((slot) => (
              <div
                key={slot.id}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                    {slot.dayOfWeek}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                  📅
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href={`/batches/${batch.id}/tests`}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-accent hover:shadow-md transition flex items-center justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">Batch Tests</h3>
            <p className="text-xs text-gray-500 mt-1">Take online tests, view upcoming schedules and results</p>
          </div>
          <span className="text-accent font-semibold text-sm">Open →</span>
        </Link>

        <Link
          href="/attendance"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-accent hover:shadow-md transition flex items-center justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">My Attendance</h3>
            <p className="text-xs text-gray-500 mt-1">Review your attendance records and statistics</p>
          </div>
          <span className="text-accent font-semibold text-sm">Open →</span>
        </Link>
      </div>
    </div>
  );
}
