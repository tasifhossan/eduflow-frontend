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
  CreditCard,
  UserPlus,
  Clock,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { formatMoney } from '@/lib/format';
import {
  StudentAcademicsCards,
  TeacherAcademicsCards,
  AdminAcademicsSummaryCard,
} from '@/components/dashboard/academic-dashboard-cards';

// ─── Response Types ────────────────────────────────────────────────────────

interface UpcomingTest {
  id: string;
  title: string;
  testDate: string;
  type: 'MCQ' | 'WRITTEN' | 'MIXED';
  batch: { id: string; name: string };
}

interface StudentFeeAccountSummary {
  totals?: {
    totalOutstanding?: string;
    totalEffective?: string;
  };
  studentCredit?: string;
  summary?: {
    totalOutstanding?: string;
    totalEffective?: string;
    studentCredit?: string;
  };
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
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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

interface LedgerDuesData {
  summary: {
    totalDue: string;
    totalPaid: string;
    totalOutstanding: string;
    totalStudentsWithDues: number;
  };
  items: Array<{
    studentId: string;
    name: string;
    studentCode: string;
    outstanding: string;
    status: string;
  }>;
}

function FeeCollectionCard({ duesData }: { duesData: LedgerDuesData }) {
  const overallOutstanding = duesData.summary?.totalOutstanding || '0.00';

  return (
    <SectionCard
      title="Fee Collection Summary"
      description="Active student dues tracked in the append-only ledger"
      actions={
        <div className="flex items-center gap-3">
          <Link
            href="/fees/collect"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Collect Payment
          </Link>
          <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg px-3.5 py-1 text-right">
            <span className="text-[10px] font-bold text-status-danger uppercase tracking-wider block">
              Total Outstanding
            </span>
            <span className="text-base sm:text-lg font-heading font-extrabold text-status-danger-text font-mono">
              {formatMoney(overallOutstanding)}
            </span>
          </div>
        </div>
      }
      noPadding
    >
      {duesData.items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="All fees settled"
            description="No pending or partial fee balances recorded in the ledger."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-surface-hover/30">
                <th className="px-5 sm:px-6 py-3">Student Name</th>
                <th className="px-4 py-3">Student Code</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Outstanding Amount</th>
                <th className="px-5 sm:px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {duesData.items.slice(0, 5).map((item) => (
                <tr key={item.studentId} className="hover:bg-surface-hover/40 transition-colors">
                  <td className="px-5 sm:px-6 py-3.5 font-semibold text-foreground">
                    <Link href={`/fees/students/${item.studentId}`} className="hover:text-primary transition">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                    {item.studentCode || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge
                      variant={
                        item.status.includes('OVERDUE')
                          ? 'overdue'
                          : item.status.includes('PARTIAL')
                          ? 'partial'
                          : 'due'
                      }
                      label={item.status}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-status-danger-text">
                    {formatMoney(item.outstanding)}
                  </td>
                  <td className="px-5 sm:px-6 py-3.5 text-right">
                    <Link
                      href={`/fees/students/${item.studentId}`}
                      className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      Ledger →
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

function AccountantDashboard({ duesData }: { duesData?: LedgerDuesData | null }) {
  const summary = duesData?.summary;

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Outstanding Dues"
          value={formatMoney(summary?.totalOutstanding || '0.00')}
          unit="pending"
          icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Total Billed"
          value={formatMoney(summary?.totalDue || '0.00')}
          unit="charges"
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Collections Settled"
          value={formatMoney(summary?.totalPaid || '0.00')}
          unit="paid"
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Students With Dues"
          value={summary?.totalStudentsWithDues || 0}
          unit="accounts"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Quick Action */}
      <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Record Student Payment</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect tuition, admission, or other student fees into the append-only ledger.
          </p>
        </div>
        <Link
          href="/fees/collect"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
        >
          <CreditCard className="h-4 w-4" />
          Collect Payment Now
        </Link>
      </div>

      {/* Dues breakdown table */}
      {duesData && <FeeCollectionCard duesData={duesData} />}
    </div>
  );
}

function StudentFeeSummaryCard({ account }: { account: StudentFeeAccountSummary | null }) {
  if (!account) return null;
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">My Fee Account</p>
          <p className="text-xs text-muted-foreground">
            Outstanding:{' '}
            <span className="font-bold text-status-danger-text font-mono">
              {formatMoney(account.totals?.totalOutstanding || '0.00')}
            </span>{' '}
            • Credit:{' '}
            <span className="font-bold text-status-success-text font-mono">
              {formatMoney(account.studentCredit || '0.00')}
            </span>
          </p>
        </div>
      </div>
      <Link
        href="/my-fees"
        className="rounded-[var(--radius-control)] bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
      >
        View My Fees & Receipts →
      </Link>
    </div>
  );
}

function GuardianFeeSummaryCard({ childrenCount }: { childrenCount: number }) {
  if (childrenCount === 0) return null;
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Student Fees & Receipts</p>
          <p className="text-xs text-muted-foreground">
            Review detailed fee statements, pending balances, and download official payment receipts for your linked students.
          </p>
        </div>
      </div>
      <Link
        href="/my-fees"
        className="rounded-[var(--radius-control)] bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition whitespace-nowrap"
      >
        View Fees & Receipts →
      </Link>
    </div>
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

interface EnquirySummaryData {
  stageCounts: Record<string, number>;
  activeInPipeline: number;
  newLast7Days: number;
  followUpsToday: number;
  followUpsOverdue: number;
  last90Days: {
    total: number;
    admitted: number;
    conversionRatePercent: number;
    bySource: Record<string, number>;
  };
}

function AdmissionsSummaryCard({ summary }: { summary: EnquirySummaryData }) {
  const overdueCount = summary.followUpsOverdue || 0;
  const todayCount = summary.followUpsToday || 0;
  const new7dCount = summary.newLast7Days || 0;
  const activeCount = summary.activeInPipeline || 0;

  return (
    <SectionCard
      title="Admissions & Prospect Pipeline"
      description="Active enquiry stages, conversion, and urgent follow-ups"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admissions"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Admissions Board
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30">
          <p className="text-xs font-medium text-muted-foreground">New (Last 7d)</p>
          <p className="text-xl font-heading font-bold text-foreground mt-1">{new7dCount}</p>
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30">
          <p className="text-xs font-medium text-muted-foreground">Active in Pipeline</p>
          <p className="text-xl font-heading font-bold text-primary mt-1">{activeCount}</p>
        </div>
        <Link
          href="/admissions?followUp=today"
          className="p-3 rounded-[var(--radius-control)] border border-status-info-border bg-status-info-bg hover:opacity-90 transition block"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-status-info-text">Due Today</p>
            <Clock className="h-3.5 w-3.5 text-status-info" />
          </div>
          <p className="text-xl font-heading font-bold text-status-info-text mt-1">{todayCount}</p>
        </Link>
        <Link
          href="/admissions?followUp=overdue"
          className={`p-3 rounded-[var(--radius-control)] border transition block ${
            overdueCount > 0
              ? 'border-status-danger-border bg-status-danger-bg'
              : 'border-border bg-surface-hover/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${overdueCount > 0 ? 'text-status-danger-text font-bold' : 'text-muted-foreground'}`}>
              Overdue
            </p>
            {overdueCount > 0 && <AlertCircle className="h-3.5 w-3.5 text-status-danger" />}
          </div>
          <p className={`text-xl font-heading font-bold mt-1 ${overdueCount > 0 ? 'text-status-danger-text' : 'text-foreground'}`}>
            {overdueCount}
          </p>
        </Link>
      </div>

      <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium mr-1">Pipeline stages:</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-border bg-surface text-foreground font-medium">
          New: <strong className="ml-1">{summary.stageCounts?.NEW || 0}</strong>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-border bg-surface text-foreground font-medium">
          Contacted: <strong className="ml-1">{summary.stageCounts?.CONTACTED || 0}</strong>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-border bg-surface text-foreground font-medium">
          Visit: <strong className="ml-1">{summary.stageCounts?.VISIT_SCHEDULED || 0}</strong>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-border bg-surface text-foreground font-medium">
          Trial: <strong className="ml-1">{summary.stageCounts?.TRIAL || 0}</strong>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-status-success-border bg-status-success-bg text-status-success-text font-medium">
          Admitted: <strong className="ml-1">{summary.stageCounts?.ADMITTED || 0}</strong>
        </span>
        {summary.last90Days?.conversionRatePercent !== undefined && (
          <span className="ml-auto text-muted-foreground text-xs font-medium">
            90d Conversion: <span className="font-bold text-foreground">{summary.last90Days.conversionRatePercent}%</span>
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Admin / Teacher View ─────────────────────────────────────────────────

function AdminTeacherDashboard({
  data,
  dueSummary,
  enquiriesSummary,
  lowAttendanceCount,
  isAdmin,
}: {
  data: AdminTeacherSummary;
  dueSummary?: LedgerDuesData | null;
  enquiriesSummary?: EnquirySummaryData | null;
  lowAttendanceCount?: number | null;
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

      {/* Classes to mark today (Teachers) */}
      {!isAdmin && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                attendanceSummary.totalBatches - attendanceSummary.markedBatches > 0
                  ? 'bg-warning-subtle text-warning border-warning/20'
                  : 'bg-secondary-subtle text-secondary border-secondary/20'
              }`}
            >
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Classes to mark today
              </div>
              <div className="text-lg font-bold text-foreground">
                {attendanceSummary.totalBatches - attendanceSummary.markedBatches > 0 ? (
                  <span>{attendanceSummary.totalBatches - attendanceSummary.markedBatches} classes pending</span>
                ) : (
                  <span>All classes marked for today</span>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/attendance"
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline shrink-0"
          >
            Mark attendance →
          </Link>
        </div>
      )}

      {/* Low Attendance Warning Card (Admins) */}
      {isAdmin && typeof lowAttendanceCount === 'number' && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                lowAttendanceCount > 0
                  ? 'bg-danger-subtle text-danger border-danger/20'
                  : 'bg-secondary-subtle text-secondary border-secondary/20'
              }`}
            >
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Low Attendance Warning
              </div>
              <div className="text-lg font-bold text-foreground">
                {lowAttendanceCount > 0 ? (
                  <span>{lowAttendanceCount} student{lowAttendanceCount > 1 ? 's' : ''} below threshold</span>
                ) : (
                  <span>All students on track</span>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/attendance/low"
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline shrink-0"
          >
            View report →
          </Link>
        </div>
      )}

      {/* Fee Collection Card (ADMIN & SUPER_ADMIN only) */}
      {isAdmin && dueSummary && (
        <FeeCollectionCard duesData={dueSummary} />
      )}

      {/* Admissions Pipeline Card (ADMIN & SUPER_ADMIN only) */}
      {isAdmin && enquiriesSummary && (
        <AdmissionsSummaryCard summary={enquiriesSummary} />
      )}

      {/* Academics summary (Admin) or Teacher cards */}
      {isAdmin ? (
        <AdminAcademicsSummaryCard />
      ) : (
        <TeacherAcademicsCards />
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

function StudentDashboard({
  data,
  account,
  monthPercent,
}: {
  data: StudentSummary;
  account?: StudentFeeAccountSummary | null;
  monthPercent?: number | null;
}) {
  const { enrolledBatchCount, enrolledBatches, upcomingTests, recentAttendance } = data;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard
          label="My Batches"
          value={enrolledBatchCount}
          unit="enrolled"
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="This Month's Rate"
          value={typeof monthPercent === 'number' ? `${monthPercent}%` : '—'}
          unit="attendance"
          icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
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

      {/* Fee Account Summary */}
      {account && <StudentFeeSummaryCard account={account} />}

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

      {/* Academics: Today's classes, Upcoming assignments & Syllabus progress */}
      <StudentAcademicsCards />

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

function GuardianDashboard({
  data,
  monthPercent,
}: {
  data: GuardianSummary;
  monthPercent?: number | null;
}) {
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
        {monthPercent !== null && (
          <StatCard
            label="This Month's Rate"
            value={`${monthPercent}%`}
            unit="attendance"
            icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
          />
        )}
      </div>

      {/* Guardian Fee Summary Card */}
      <GuardianFeeSummaryCard childrenCount={childrenCount} />

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

                <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                  <Link
                    href="/my-fees"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] border border-border hover:bg-surface-hover text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>Fees</span>
                  </Link>
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

      {/* Academics cards for linked student */}
      {children.length > 0 && (
        <StudentAcademicsCards studentId={children[0]?.id} />
      )}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let summary: DashboardSummary | null = null;
  let ledgerDuesData: LedgerDuesData | null = null;
  let enquiriesSummaryData: EnquirySummaryData | null = null;
  let studentAccountData: StudentFeeAccountSummary | null = null;
  let lowAttendanceCount: number | null = null;
  let attendanceMonthPercent: number | null = null;
  let errorMsg: string | null = null;

  try {
    const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ACCOUNTANT';
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    if (user?.role !== 'ACCOUNTANT') {
      const response = await apiGet<{ success: boolean; data: DashboardSummary }>(
        '/api/dashboard/summary',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);
      if (response?.success) {
        summary = response.data;
      }
    }

    if (isStaff) {
      const duesRes = await apiGet<{ success: boolean; data: LedgerDuesData }>(
        '/api/fees/dues?limit=5',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (duesRes?.success && duesRes.data) {
        ledgerDuesData = duesRes.data;
      }
    }

    if (isAdmin) {
      const enqRes = await apiGet<{ success: boolean; data: EnquirySummaryData }>(
        '/api/enquiries/summary',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (enqRes?.success && enqRes.data) {
        enquiriesSummaryData = enqRes.data;
      }

      const lowRes = await apiGet<{ success: boolean; data: { pagination: { total: number } } }>(
        '/api/attendance/low?limit=1',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (lowRes?.success && lowRes.data?.pagination) {
        lowAttendanceCount = lowRes.data.pagination.total;
      }
    }

    if (user?.role === 'STUDENT' || user?.role === 'GUARDIAN') {
      const attRes = await apiGet<{ success: boolean; data: { monthPercent: number } }>(
        '/api/my/attendance/summary',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (attRes?.success && attRes.data && typeof attRes.data.monthPercent === 'number') {
        attendanceMonthPercent = attRes.data.monthPercent;
      }
    }

    if (user?.role === 'STUDENT') {
      const studentRes = await apiGet<{ success: boolean; data: StudentFeeAccountSummary }>(
        '/api/fees/my-account',
        {
          headers: { Cookie: cookieHeader },
          cache: 'no-store',
        }
      ).catch(() => null);

      if (studentRes?.success && studentRes.data) {
        studentAccountData = studentRes.data;
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard summary';
  }

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

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
      {user?.role === 'ACCOUNTANT' && (
        <AccountantDashboard duesData={ledgerDuesData} />
      )}
      {summary && summary.role === 'GUARDIAN' && (
        <GuardianDashboard data={summary as GuardianSummary} monthPercent={attendanceMonthPercent} />
      )}
      {summary && summary.role === 'STUDENT' && (
        <StudentDashboard data={summary as StudentSummary} account={studentAccountData} monthPercent={attendanceMonthPercent} />
      )}
      {summary && (summary.role === 'ADMIN' || summary.role === 'TEACHER') && (
        <AdminTeacherDashboard
          data={summary as AdminTeacherSummary}
          dueSummary={ledgerDuesData}
          enquiriesSummary={enquiriesSummaryData}
          lowAttendanceCount={lowAttendanceCount}
          isAdmin={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'}
        />
      )}

      {/* Empty / fallback state */}
      {!summary && user?.role !== 'ACCOUNTANT' && !errorMsg && (
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
