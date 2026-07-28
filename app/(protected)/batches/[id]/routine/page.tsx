'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface BatchDetails {
  id: string;
  name: string;
}

interface RoutineSlot {
  id: string;
  dayOfWeek: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  startTime: string;
  endTime: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export default function BatchRoutinePage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [slots, setSlots] = useState<RoutineSlot[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add Slot Form State
  const [dayOfWeek, setDayOfWeek] = useState<typeof DAYS_OF_WEEK[number]>('SUNDAY');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // UI Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify role and load initial data
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
        setIsAdmin(payload.role === 'ADMIN');
      } catch (err) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    async function loadRoutineData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch batch details
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        // Fetch routine slots
        await fetchSlots();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load routine details');
      } finally {
        setLoading(false);
      }
    }

    loadRoutineData();
  }, [batchId, router]);

  const fetchSlots = async () => {
    const routineRes = await apiGet<{ success: boolean; data: RoutineSlot[] }>(`/api/batches/${batchId}/routine`);
    if (routineRes.success) {
      setSlots(routineRes.data);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!startTime || !endTime) {
      setErrorMsg('Both start time and end time are required');
      return;
    }

    // Verify time logic
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (endH * 60 + endM <= startH * 60 + startM) {
      setErrorMsg('End time must be after start time');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiPost('/api/routines', {
        batchId,
        dayOfWeek,
        startTime,
        endTime,
      });

      if (response && response.success) {
        setSuccessMsg('Routine slot added successfully!');
        setStartTime('');
        setEndTime('');
        await fetchSlots();
      } else {
        setErrorMsg(response.message || 'Failed to add routine slot');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while adding slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this class slot?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await apiDelete(`/api/routines/${slotId}`);
      if (response && response.success) {
        setSuccessMsg('Routine slot deleted successfully!');
        await fetchSlots();
      } else {
        setErrorMsg(response.message || 'Failed to delete routine slot');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while deleting slot');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading class routine...</span>
      </div>
    );
  }

  if (errorMsg && !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Routine</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  // Format 24h string (HH:mm) into 12h AM/PM string for pretty UI
  const formatTime12h = (time24h: string) => {
    const [hourStr, minStr] = time24h.split(':');
    const hour = Number(hourStr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch?.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Routine</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Class Routine</h1>
            <p className="mt-2 text-sm text-gray-500">Weekly schedule slots for {batch?.name}</p>
          </div>
          <Link
            href={`/batches/${batchId}`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Back to Batch Details
          </Link>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-sm text-green-700 font-medium">
              ✓ {successMsg}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Group 1: Routine List / Grid (Col-Span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Weekly Schedule</h2>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const daySlots = slots.filter((s) => s.dayOfWeek === day);

                  return (
                    <div
                      key={day}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-gray-200 p-4 bg-gray-50/30 gap-y-3"
                    >
                      <div className="w-32 flex-shrink-0">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 uppercase tracking-wider">
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2">
                        {daySlots.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No classes scheduled</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="inline-flex items-center gap-x-2 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm"
                              >
                                <span>
                                  {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                                </span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="text-red-500 hover:text-red-700 font-bold ml-1 transition"
                                    title="Delete slot"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Group 2: Add Slot Form (Col-Span-1) - Scoped to ADMIN */}
          {isAdmin ? (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Add Schedule Slot</h2>

                <form onSubmit={handleAddSlot} className="space-y-4">
                  <div>
                    <label htmlFor="daySelect" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Select Day of Week
                    </label>
                    <select
                      id="daySelect"
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value as typeof DAYS_OF_WEEK[number])}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
                      required
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day} value={day}>
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="startInput" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      id="startInput"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="endInput" className="block text-xs font-semibold text-gray-600 mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      id="endInput"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm font-medium"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Slot'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 text-xs">
                <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Class slot management actions are restricted to Administrators only. Teachers can read schedules.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
