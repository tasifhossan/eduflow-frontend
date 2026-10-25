import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusBadge,
  EmptyState,
  ErrorState,
} from '@/components/dashboard';
import {
  Users,
  Layers,
  GraduationCap,
  CalendarCheck,
  Activity,
  ArrowRight,
  HeartHandshake,
} from 'lucide-react';

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

interface GuardianSummary {
  role: 'GUARDIAN';
  childrenCount: number;
  children: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    enrolledBatches: { id: string; name: string }[];
  }[];
}

type DashboardSummary = AdminTeacherSummary | StudentSummary | GuardianSummary;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function TestTypeBadge({ type }: { type: string }) {
  if (type === 'MCQ') {
    return <StatusBadge variant="upcoming">{type}</StatusBadge>;
  }
  if (type === 'WRITTEN') {
    return <StatusBadge variant="closed">{type}</StatusBadge>;
  }
  return <StatusBadge variant="partial">{type}</StatusBadge>;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FeeCollectionCard({ dueSummary }: { dueSummary: DueSummaryItem[] }) {
  const overallOutstanding = dueSummary.reduce((sum, item) => sum + item.totalRemaining, 0);

  return (
    <SectionCard
      title="Fee Collection Summary"
      description="Pending and partial student dues categorized by batch"
      actions={
        <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg px-3.5 py-1.5 text-right">
          <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
            Total Outstanding
          </span>
          <span className="text-base sm:text-lg font-heading font-extrabold text-status-danger-text">
            ৳{overallOutstanding.toLocaleString()}
          </span>
        </div>
      }
      noPadding
    >
      {dueSummary.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="All fees settled"
            description="No pending or partial fee balances recorded across any batch."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-surface-hover/30">
                <th className="px-5 sm:px-6 py-3">Batch Name</th>
                <th className="px-4 py-3 text-center">Due Count</th>
                <th className="px-4 py-3 text-center">Partial Count</th>
                <th className="px-5 py-3 text-right">Outstanding Amount</th>
                <th className="px-5 sm:px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dueSummary.map((item) => (
                <tr key={item.batchId} className="hover:bg-surface-hover/40 transition-colors">
                  <td className="px-5 sm:px-6 py-3.5 font-semibold text-foreground">
                    {item.batchName}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge variant="due">
                      {item.dueCount} Due
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge variant="partial">
                      {item.partialCount} Partial
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3.5 text-right font-heading font-bold text-foreground">
                    ৳{item.totalRemaining.toLocaleString()}
                  </td>
                  <td className="px-5 sm:px-6 py-3.5 text-right">
                    <Link
                      href={`/batches/${item.batchId}/payments`}
                      className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
    </SectionCard>
  );
}

function UpcomingTestsList({ tests }: { tests: UpcomingTest[] }) {
  if (tests.length === 0) {
    return (
      <SectionCard title="Upcoming Tests" description="Next 7 days schedule">
        <EmptyState
          title="No scheduled tests"
          description="There are no upcoming exams scheduled in the next 7 days."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Upcoming Tests"
      description="Scheduled within the next 7 days"
      noPadding
    >
      <ul className="divide-y divide-border" role="list">
        {tests.map((test) => (
          <li key={test.id} className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-surface-hover/40 transition-colors gap-3">
            <div className="min-w-0">
              <Link
                href={`/batches/${test.batch.id}/tests/${test.id}/manage`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {test.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">{test.batch.name}</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <TestTypeBadge type={test.type} />
              <span className="text-xs font-medium text-muted-foreground bg-muted border border-border rounded-[var(--radius-control)] px-2.5 py-1">
                {formatDate(test.testDate)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function StudentUpcomingTestsList({ tests }: { tests: UpcomingTest[] }) {
  if (tests.length === 0) {
    return (
      <SectionCard title="Upcoming Tests" description="Tests in the next 7 days">
        <EmptyState
          title="No upcoming tests"
          description="You have no tests scheduled in the next 7 days."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Upcoming Tests"
      description="Tests scheduled for your enrolled batches"
      noPadding
    >
      <ul className="divide-y divide-border" role="list">
        {tests.map((test) => (
          <li key={test.id} className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-surface-hover/40 transition-colors gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{test.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{test.batch.name}</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <TestTypeBadge type={test.type} />
              <span className="text-xs font-medium text-muted-foreground bg-muted border border-border rounded-[var(--radius-control)] px-2.5 py-1">
                {formatDate(test.testDate)}
              </span>
              <Link
                href={`/batches/${test.batch.id}/tests/${test.id}/take`}
                className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Take →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// ─── DB Status badge (token-based) ──────────────────────────────────────────

async function DbStatusBadge({ cookieHeader }: { cookieHeader: string }) {
  let isOk = false;
  try {
    const resp = await apiGet<{ status: string }>('/api/health/db', {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    isOk = resp?.status === 'ok';
  } catch {
    isOk = false;
  }

  return (
    <StatusBadge variant={isOk ? 'present' : 'absent'} showDot>
      {isOk ? 'System Healthy' : 'System Offline'}
    </StatusBadge>
  );
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
        <StatCard
          label="Active Students"
          value={stats.totalActiveStudents}
          unit="enrolled"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Total Batches"
          value={stats.totalBatches}
          unit="in branch"
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Teachers"
          value={stats.totalTeachers}
          unit="on staff"
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Fee Collection Card (ADMIN only) */}
      {isAdmin && dueSummary && (
        <FeeCollectionCard dueSummary={dueSummary} />
      )}

      {/* Attendance summary */}
      <SectionCard
        title="Today's Attendance"
        description="Batch attendance completion tracking"
        actions={
          <Link
            href="/attendance"
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Full attendance dashboard →
          </Link>
        }
      >
        <div className="flex items-baseline gap-x-3 mb-4">
          <span className="text-3xl font-heading font-extrabold text-foreground">
            {attendanceSummary.markedBatches}
          </span>
          <span className="text-sm text-muted-foreground">
            of {attendanceSummary.totalBatches} batches fully marked ({attendancePct}%)
          </span>
        </div>

        {/* Accessible Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={attendancePct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-muted border border-border rounded-[var(--radius-pill)] h-2.5 mb-4 overflow-hidden"
        >
          <div
            className="bg-primary h-full rounded-[var(--radius-pill)] transition-all duration-500"
            style={{ width: `${attendancePct}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-medium pt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-success shrink-0" aria-hidden="true" />
            <span className="text-foreground">{attendanceSummary.markedBatches} Marked</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-warning shrink-0" aria-hidden="true" />
            <span className="text-foreground">{attendanceSummary.partialBatches} Partial</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-danger shrink-0" aria-hidden="true" />
            <span className="text-foreground">{attendanceSummary.unmarkedBatches} Unmarked</span>
          </span>
        </div>
      </SectionCard>

      {/* Upcoming tests */}
      <UpcomingTestsList tests={upcomingTests} />

      {/* Recent activity */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface px-5 sm:px-6 py-4 shadow-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0" aria-hidden="true">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Recent Submissions</p>
            <p className="text-xs text-muted-foreground">Test results recorded this week</p>
          </div>
        </div>
        <span className="text-2xl font-heading font-extrabold text-foreground">
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
        <StatCard
          label="My Batches"
          value={enrolledBatchCount}
          unit="enrolled"
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Present (7 Days)"
          value={recentAttendance.presentCount}
          unit="days"
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Absent (7 Days)"
          value={recentAttendance.absentCount}
          unit="days"
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Enrolled batches */}
      {enrolledBatches.length > 0 && (
        <SectionCard
          title="My Enrolled Batches"
          description="Your active academic batches and subject streams"
          noPadding
        >
          <ul className="divide-y divide-border" role="list">
            {enrolledBatches.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-surface-hover/40 transition-colors gap-3">
                <span className="text-sm font-semibold text-foreground truncate">{batch.name}</span>
                <Link
                  href={`/batches/${batch.id}`}
                  className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  View Details →
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Upcoming tests */}
      <StudentUpcomingTestsList tests={upcomingTests} />

      {/* Recent attendance */}
      {recentAttendance.records.length > 0 && (
        <SectionCard
          title="Recent Attendance"
          description="Your presence history across recent classes"
          noPadding
        >
          <ul className="divide-y divide-border" role="list">
            {recentAttendance.records.map((rec, i) => {
              const variantMap: Record<string, 'present' | 'absent' | 'late'> = {
                PRESENT: 'present',
                ABSENT: 'absent',
                LATE: 'late',
              };
              const variant = variantMap[rec.status] || 'present';

              return (
                <li key={i} className="flex items-center justify-between px-5 sm:px-6 py-3.5 hover:bg-surface-hover/40 transition-colors gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.batch.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(rec.date)}</p>
                  </div>
                  <StatusBadge variant={variant}>
                    {rec.status}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Guardian View ────────────────────────────────────────────────────────

function GuardianDashboard({ data }: { data: GuardianSummary }) {
  const { childrenCount, children } = data;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="My Children"
          value={childrenCount}
          unit="linked"
          icon={<HeartHandshake className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Linked children */}
      <SectionCard
        title="Linked Children"
        description="Academic records and fee statuses of your linked students"
        actions={
          <Link
            href="/my-children"
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Children directory →
          </Link>
        }
      >
        {children.length === 0 ? (
          <EmptyState
            title="No children linked"
            description="No student profiles are currently linked to your guardian account. Please contact the center administration."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-[var(--radius-control)] border border-border p-5 bg-surface-hover/20 hover:bg-surface-hover/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-bold text-foreground text-base truncate">{child.name}</h3>
                  <StatusBadge variant="upcoming">Student</StatusBadge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">Email:</span> {child.email}</p>
                  {child.phone && <p><span className="font-medium text-foreground">Phone:</span> {child.phone}</p>}
                  <p>
                    <span className="font-medium text-foreground">Batches:</span>{' '}
                    {child.enrolledBatches.length > 0
                      ? child.enrolledBatches.map((b) => b.name).join(', ')
                      : 'None'}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex justify-end">
                  <Link
                    href={`/my-children/${child.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>View records</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────

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
      }
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
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard summary';
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name || 'User'} · ${today}`}
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={<DbStatusBadge cookieHeader={cookieHeader} />}
      />

      {/* Error state */}
      {errorMsg && (
        <ErrorState
          title="Could not load dashboard data"
          message={errorMsg}
        />
      )}

      {/* Role-aware content */}
      {summary && summary.role === 'GUARDIAN' && (
        <GuardianDashboard data={summary as GuardianSummary} />
      )}
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

      {/* Empty / fallback state */}
      {!summary && !errorMsg && (
        <EmptyState
          title="Loading dashboard overview"
          description="Fetching your latest center metrics and academic routines..."
        />
      )}
    </div>
  );
}

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  );
}
