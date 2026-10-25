'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
}

interface BatchDetails {
  id: string;
  name: string;
  branchId: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MarkAttendancePage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');
  const { id: batchId } = use(params);

  // Get today's local date string YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  };

  // State Variables
  const [date, setDate] = useState(dateParam || getTodayString());
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  
  // Loading & Feedback States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Role validation
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
      loadBatchInfo();
    }
    init();
  }, [batchId, router]);

  // Fetch batch details and students once on load
  async function loadBatchInfo() {
      try {
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }
        
        const studentsRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`);
        if (studentsRes.success) {
          setStudents(studentsRes.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load batch/students data');
      }
    }

  // Fetch or reset attendance state when students list or date changes
  useEffect(() => {
    if (students.length === 0) return;

    async function loadAttendance() {
      try {
        setLoading(true);
        setSuccessMsg(null);
        setErrorMsg(null);

        const attendanceRes = await apiGet<{ success: boolean; data: AttendanceRecord[] }>(
          `/api/batches/${batchId}/attendance?date=${date}`
        );

        const initialAttendance: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
        
        // Map existing attendance records
        if (attendanceRes.success && attendanceRes.data.length > 0) {
          attendanceRes.data.forEach((rec) => {
            initialAttendance[rec.studentId] = rec.status;
          });
        }

        // Fill remaining students with default status 'PRESENT'
        students.forEach((student) => {
          if (!initialAttendance[student.id]) {
            initialAttendance[student.id] = 'PRESENT';
          }
        });

        setAttendance(initialAttendance);
      } catch (err: any) {
        console.warn('Failed to load existing attendance, defaulting to PRESENT:', err);
        // Default all to PRESENT if fetch fails/has no records
        const defaultAttendance: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
        students.forEach((student) => {
          defaultAttendance[student.id] = 'PRESENT';
        });
        setAttendance(defaultAttendance);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [batchId, date, students]);

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const response = await apiPost('/api/attendance', {
        batchId,
        date,
        records,
      });

      if (response && response.success) {
        setSuccessMsg('Attendance saved successfully!');
      } else {
        setErrorMsg(response.message || 'Failed to save attendance');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving attendance');
    } finally {
      setSaving(false);
    }
  };

  if (!batch) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        {errorMsg ? (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-center max-w-md">
            <h3 className="text-sm font-semibold text-red-800">Error Loading Batch</h3>
            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
            <Link href="/batches" className="text-primary hover:text-primary-hover hover:underline text-sm font-semibold mt-4 block">
              &larr; Back to batches
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="mt-3 text-sm text-gray-500 font-medium">Loading batch info...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch.name}</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Attendance</span>
        </nav>

        {/* Header Title & Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mark Attendance</h1>
            <p className="mt-2 text-sm text-muted-foreground">Record daily student attendance for {batch.name}</p>
          </div>
          
          {/* Date Picker Input */}
          <div className="flex items-center gap-x-3">
            <label htmlFor="attendanceDate" className="text-sm font-semibold text-foreground">
              Select Date:
            </label>
            <input
              type="date"
              id="attendanceDate"
              max={getTodayString()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm font-medium"
            />
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              <span className="font-semibold text-red-700 dark:text-red-300">Error:</span> {errorMsg}
            </p>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ {successMsg}
            </p>
          </div>
        )}

        {/* Students Table */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="ml-3 text-sm text-muted-foreground">Loading attendance data...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="mt-4 text-sm font-semibold text-foreground">No students enrolled in this batch</p>
              <p className="text-xs text-muted-foreground mt-1">Enroll students on the batch detail page before recording attendance.</p>
              <div className="mt-6">
                <Link
                  href={`/batches/${batchId}`}
                  className="inline-flex items-center rounded-md bg-surface border border-border px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover"
                >
                  Enroll Students
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-hover/50">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student Name</th>
                      <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                      <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {students.map((student) => {
                      const status = attendance[student.id] || 'PRESENT';
                      return (
                        <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-hover/40">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'PRESENT')}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  status === 'PRESENT'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'ABSENT')}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  status === 'ABSENT'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'LATE')}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  status === 'LATE'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Actions */}
              <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-surface-hover/30">
                <span className="text-xs text-muted-foreground font-medium">
                  Marking attendance for {students.length} students on {date}
                </span>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
