import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface BatchSummary {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  subjectName: string;
  teacherName?: string | null;
  totalEnrolled: number;
  todayMarkedCount: number;
  status: 'marked' | 'partial' | 'unmarked';
}

interface StudentAttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  remarks?: string | null;
  batch: {
    id: string;
    name: string;
    type: string;
  };
}

export default async function AttendancePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/dashboard');
  }

  const isStudent = user.role === 'STUDENT';

  // State / data holders
  let summaries: BatchSummary[] = [];
  let studentHistory: StudentAttendanceRecord[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    if (isStudent) {
      // Fetch student's own attendance history
      const response = await apiGet<{ success: boolean; data: StudentAttendanceRecord[] }>(
        `/api/students/${user.id}/attendance`,
        {
          headers: { Cookie: cookieHeader },
          next: { revalidate: 0 },
        }
      );
      if (response && response.success) {
        studentHistory = response.data;
      }
    } else {
      // Fetch today's summary for Admin & Teachers
      const response = await apiGet<{ success: boolean; data: BatchSummary[] }>('/api/attendance/today-summary', {
        headers: { Cookie: cookieHeader },
        next: { revalidate: 0 },
      });

      if (response && response.success) {
        summaries = response.data;
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load attendance details';
  }

  // Get local today string YYYY-MM-DD
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000);
  const todayStr = localToday.toISOString().split('T')[0];

  const markedCount = summaries.filter((s) => s.status === 'marked').length;
  const totalCount = summaries.length;

  // Student Statistics
  const presentCount = studentHistory.filter((r) => r.status === 'PRESENT').length;
  const absentCount = studentHistory.filter((r) => r.status === 'ABSENT').length;
  const lateCount = studentHistory.filter((r) => r.status === 'LATE').length;
  const totalLogged = studentHistory.length;
  const attendanceRate = totalLogged > 0 ? Math.round(((presentCount + lateCount) / totalLogged) * 100) : 100;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {isStudent ? 'My Attendance' : 'Attendance Dashboard'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isStudent
                ? 'Track your daily attendance history and record stats'
                : 'Record and track student attendance across all cohorts'}
            </p>
          </div>
          <div className="text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg px-4 py-2 border border-gray-200">
            Date: {formatDate(today, undefined, undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* ── STUDENT VIEW ──────────────────────────────────────────────────────── */}
        {isStudent && !errorMsg && (
          <>
            {/* Student Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-foreground">{attendanceRate}%</span>
                </div>
                <div className="mt-4 w-full bg-surface-hover rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Present</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-green-600 dark:text-green-400">{presentCount}</span>
                  <span className="text-sm text-muted-foreground">classes</span>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Absent</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-red-600 dark:text-red-400">{absentCount}</span>
                  <span className="text-sm text-muted-foreground">classes</span>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Late</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-amber-500">{lateCount}</span>
                  <span className="text-sm text-muted-foreground">classes</span>
                </div>
              </div>
            </div>

            {/* Student Attendance Table */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-base font-semibold text-foreground">Attendance Log</h3>
              </div>
              {studentHistory.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">No attendance logs found</h3>
                  <p className="text-xs text-muted-foreground mt-1">Your teachers haven't recorded any attendance logs yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-hover/50">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch Name</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {studentHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {formatDate(rec.date, undefined, undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                            {rec.batch.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                            <span className="rounded bg-surface-hover border border-border px-2 py-1 font-mono text-foreground">
                              {rec.batch.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                              rec.status === 'PRESENT'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-600/20'
                                : rec.status === 'LATE'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-600/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-600/20'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {rec.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TEACHER / ADMIN VIEW ────────────────────────────────────────────────── */}
        {!isStudent && !errorMsg && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Marking Progress</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-foreground">{markedCount}</span>
                  <span className="text-sm text-muted-foreground">of {totalCount} batches marked fully today</span>
                </div>
                <div className="mt-4 w-full bg-surface-hover rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${totalCount > 0 ? (markedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unmarked Batches</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-red-600 dark:text-red-400">
                    {summaries.filter((s) => s.status === 'unmarked').length}
                  </span>
                  <span className="text-sm text-muted-foreground">batches awaiting records</span>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Partially Marked</span>
                <div className="mt-2 flex items-baseline gap-x-2">
                  <span className="text-4xl font-extrabold text-amber-500">
                    {summaries.filter((s) => s.status === 'partial').length}
                  </span>
                  <span className="text-sm text-muted-foreground">batches partially logged</span>
                </div>
              </div>
            </div>

            {/* Batches Summary Table */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {summaries.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-foreground">No batches defined</h3>
              <p className="text-xs text-muted-foreground mt-1">Create batches in the branch before logging attendance summaries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-hover/50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch Name</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Level</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teacher</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Students</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Status</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {summaries.map((batch) => (
                    <tr key={batch.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/batches/${batch.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                          {batch.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {batch.classLevel || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                        {batch.subjectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {batch.teacherName || <span className="text-muted-foreground italic">Unassigned</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <span className="font-semibold">{batch.totalEnrolled}</span> students
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                          batch.status === 'marked'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-600/20'
                            : batch.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-600/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-600/20'
                        }`}>
                          {batch.status === 'marked'
                            ? 'Marked'
                            : batch.status === 'partial'
                            ? `Partial (${batch.todayMarkedCount}/${batch.totalEnrolled})`
                            : 'Unmarked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/batches/${batch.id}/attendance?date=${todayStr}`}
                          className="inline-flex items-center rounded-md bg-surface border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                        >
                          {batch.status === 'unmarked' ? 'Take Attendance' : 'Edit Attendance'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )}
  </div>
</div>
);
}
