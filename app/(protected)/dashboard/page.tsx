import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';

// ─── Response Types ────────────────────────────────────────────────────────

interface UpcomingTest {
  id: string;
  title: string;
  testDate: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED';
  batch: { id: string; name: string };
}

interface DueSummaryItem {
  batchId: string;
  batchName: string;
  dueCount: number;
  partialCount: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalRemaining: number;
}

interface AdminTeacherSummary {
  role: 'ADMIN' | 'TEACHER';
  stats: {
    totalActiveStudents: number;
    totalBatches: number;
    totalTeachers: number;
  };
  attendanceSummary: {
    totalBatches: number;
    markedBatches: number;
    partialBatches: number;
    unmarkedBatches: number;
  };
  upcomingTests: UpcomingTest[];
  recentActivity: {
    testResultsThisWeek: number;
  };
}

interface StudentSummary {
  role: 'STUDENT';
  enrolledBatchCount: number;
  enrolledBatches: { id: string; name: string }[];
  upcomingTests: UpcomingTest[];
  recentAttendance: {
    records: { date: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; batch: { id: string; name: string } }[];
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
}

type DashboardSummary = AdminTeacherSummary | StudentSummary;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function testTypeBadge(type: string) {
  const styles: Record<string, string> = {
    MCQ: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    WRITTEN: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    MIXED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };
  return styles[type] ?? 'bg-gray-50 text-gray-700 ring-gray-600/20';
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="mt-2 flex items-baseline gap-x-2">
        <span className="text-4xl font-extrabold text-gray-900">{value}</span>
        {sub && <span className="text-sm text-gray-500">{sub}</span>}
      </div>
    </div>
  );
}

function FeeCollectionCard({ dueSummary }: { dueSummary: DueSummaryItem[] }) {
  const overallOutstanding = dueSummary.reduce((sum, item) => sum + item.totalRemaining, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Fee Collection</h2>
          <p className="text-xs text-gray-500 mt-0.5">Summary of pending & partial student fees by batch</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 self-start sm:self-auto text-right">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Total Outstanding</span>
          <span className="text-lg font-extrabold text-red-700">৳{overallOutstanding.toLocaleString()}</span>
        </div>
      </div>

      {dueSummary.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-4 text-center">
          No pending or partial fee payments recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3">Batch Name</th>
                <th className="pb-3 text-center">DUE Count</th>
                <th className="pb-3 text-center">PARTIAL Count</th>
                <th className="pb-3 text-right">Outstanding Amount</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dueSummary.map((item) => (
                <tr key={item.batchId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 font-semibold text-gray-900">
                    {item.batchName}
                  </td>
                  <td className="py-3 text-center font-medium">
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                      {item.dueCount} DUE
                    </span>
                  </td>
                  <td className="py-3 text-center font-medium">
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      {item.partialCount} PARTIAL
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900">
                    ৳{item.totalRemaining.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/batches/${item.batchId}/payments`}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Payments →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UpcomingTestsList({ tests }: { tests: UpcomingTest[] }) {
  if (tests.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Upcoming Tests</h2>
          <span className="text-xs text-gray-400">Next 7 days</span>
        </div>
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          No tests scheduled in the next 7 days.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Upcoming Tests</h2>
        <span className="text-xs text-gray-400">Next 7 days · up to 5</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {tests.map((test) => (
          <li key={test.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors">
            <div className="min-w-0">
              <Link
                href={`/batches/${test.batch.id}/tests/${test.id}/manage`}
                className="text-sm font-semibold text-accent hover:underline truncate block"
              >
                {test.title}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">{test.batch.name}</p>
            </div>
            <div className="flex items-center gap-x-3 ml-4 flex-shrink-0">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${testTypeBadge(test.type)}`}>
                {test.type}
              </span>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-md px-2 py-1">
                {formatDate(test.testDate)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudentUpcomingTestsList({ tests }: { tests: UpcomingTest[] }) {
  if (tests.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Upcoming Tests</h2>
        </div>
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          No upcoming tests in the next 7 days.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Upcoming Tests</h2>
        <span className="text-xs text-gray-400">Next 7 days</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {tests.map((test) => (
          <li key={test.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{test.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{test.batch.name}</p>
            </div>
            <div className="flex items-center gap-x-3 ml-4 flex-shrink-0">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${testTypeBadge(test.type)}`}>
                {test.type}
              </span>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-md px-2 py-1">
                {formatDate(test.testDate)}
              </span>
              <Link
                href={`/batches/${test.batch.id}/tests/${test.id}/take`}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Take →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── DB Status badge (small, unobtrusive) ────────────────────────────────

async function DbStatusBadge({ cookieHeader }: { cookieHeader: string }) {
  try {
    const resp = await apiGet<{ status: string }>('/api/health/db', {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    const ok = resp?.status === 'ok';
    return (
      <span className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ok ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-600' : 'bg-red-600'}`} />
        System {ok ? 'OK' : 'Error'}
      </span>
    );
  } catch {
    return (
      <span className="inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        System Error
      </span>
    );
  }
}

// ─── Admin / Teacher View ─────────────────────────────────────────────────

function AdminTeacherDashboard({
  data,
  dueSummary,
  isAdmin,
}: {
  data: AdminTeacherSummary;
  dueSummary?: DueSummaryItem[];
  isAdmin?: boolean;
}) {
  const { stats, attendanceSummary, upcomingTests, recentActivity } = data;
  const attendancePct =
    attendanceSummary.totalBatches > 0
      ? Math.round((attendanceSummary.markedBatches / attendanceSummary.totalBatches) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Active Students" value={stats.totalActiveStudents} sub="enrolled" />
        <StatCard label="Total Batches" value={stats.totalBatches} sub="in branch" />
        <StatCard label="Teachers" value={stats.totalTeachers} sub="on staff" />
      </div>

      {/* Fee Collection Card (ADMIN only) */}
      {isAdmin && dueSummary && (
        <FeeCollectionCard dueSummary={dueSummary} />
      )}

      {/* Attendance summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Today's Attendance</h2>
          <Link
            href="/attendance"
            className="text-xs font-semibold text-accent hover:underline"
          >
            View full dashboard →
          </Link>
        </div>

        <div className="flex items-center gap-x-4 mb-4">
          <span className="text-3xl font-extrabold text-gray-900">
            {attendanceSummary.markedBatches}
          </span>
          <span className="text-sm text-gray-500">
            of {attendanceSummary.totalBatches} batches fully marked
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${attendancePct}%` }}
          />
        </div>

        <div className="flex gap-x-6 text-sm">
          <span className="flex items-center gap-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-gray-600">{attendanceSummary.markedBatches} Marked</span>
          </span>
          <span className="flex items-center gap-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-gray-600">{attendanceSummary.partialBatches} Partial</span>
          </span>
          <span className="flex items-center gap-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-gray-600">{attendanceSummary.unmarkedBatches} Unmarked</span>
          </span>
        </div>
      </div>

      {/* Upcoming tests */}
      <UpcomingTestsList tests={upcomingTests} />

      {/* Recent activity */}
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
          <p className="text-xs text-gray-500 mt-0.5">Tests submitted this week</p>
        </div>
        <span className="text-2xl font-extrabold text-gray-900">
          {recentActivity.testResultsThisWeek}
        </span>
      </div>
    </div>
  );
}

// ─── Student View ─────────────────────────────────────────────────────────

function StudentDashboard({ data }: { data: StudentSummary }) {
  const { enrolledBatchCount, enrolledBatches, upcomingTests, recentAttendance } = data;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="My Batches" value={enrolledBatchCount} sub="enrolled" />
        <StatCard label="Present (7d)" value={recentAttendance.presentCount} sub="days" />
        <StatCard label="Absent (7d)" value={recentAttendance.absentCount} sub="days" />
      </div>

      {/* Enrolled batches */}
      {enrolledBatches.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">My Batches</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {enrolledBatches.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/60 transition-colors">
                <span className="text-sm font-medium text-gray-900">{batch.name}</span>
                <Link
                  href={`/batches/${batch.id}`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming tests */}
      <StudentUpcomingTestsList tests={upcomingTests} />

      {/* Recent attendance */}
      {recentAttendance.records.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Attendance</h2>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {recentAttendance.records.map((rec, i) => {
              const statusStyles: Record<string, string> = {
                PRESENT: 'bg-green-50 text-green-700 ring-green-600/20',
                ABSENT: 'bg-red-50 text-red-700 ring-red-600/20',
                LATE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
              };
              return (
                <li key={i} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.batch.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(rec.date)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[rec.status]}`}>
                    {rec.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let summary: DashboardSummary | null = null;
  let dueSummaryData: DueSummaryItem[] = [];
  let errorMsg: string | null = null;

  try {
    const response = await apiGet<{ success: boolean; data: DashboardSummary }>(
      '/api/dashboard/summary',
      {
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
      },
    );
    if (response?.success) {
      summary = response.data;
    }

    if (user?.role === 'ADMIN') {
      const dueRes = await apiGet<{ success: boolean; data: DueSummaryItem[] }>(
        '/api/payments/due-summary',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (dueRes?.success && dueRes.data) {
        dueSummaryData = dueRes.data;
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load dashboard summary';
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">{today}</p>
          </div>
          {/* Small unobtrusive system status badge */}
          <DbStatusBadge cookieHeader={cookieHeader} />
        </div>

        {/* Error state */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* Role-aware content */}
        {summary && summary.role === 'STUDENT' && (
          <StudentDashboard data={summary as StudentSummary} />
        )}
        {summary && (summary.role === 'ADMIN' || summary.role === 'TEACHER') && (
          <AdminTeacherDashboard
            data={summary as AdminTeacherSummary}
            dueSummary={dueSummaryData}
            isAdmin={user?.role === 'ADMIN'}
          />
        )}

        {/* Fallback if fetch failed but user is known */}
        {!summary && !errorMsg && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">Loading dashboard data…</p>
          </div>
        )}
      </div>
    </div>
  );
}
