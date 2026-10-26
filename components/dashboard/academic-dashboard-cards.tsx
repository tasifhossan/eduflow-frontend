'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  AlertTriangle,
  ChevronRight,
  Video,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCenterTime, getTimezoneDisplay } from '@/lib/tz';
import { useCenter } from '@/components/providers/center-provider';
import { SectionCard } from '@/components/dashboard/section-card';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SyllabusProgressCard } from '@/components/dashboard/syllabus-progress-card';

// ─── Student / Guardian: Today's Classes & Upcoming Assignments ────────────

interface LectureToday {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  canJoinNow?: boolean;
  onlineMeetingUrl?: string | null;
  batch?: { id: string; name: string };
  subject?: { id: string; name: string };
  teacher?: { id: string; name: string };
}

interface UpcomingAssignmentItem {
  id: string;
  title: string;
  dueAt: string;
  maxMarks: number | string;
  mode: string;
  batch?: { id: string; name: string };
  subject?: { id: string; name: string };
}

export function StudentAcademicsCards({ studentId }: { studentId?: string }) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const [classes, setClasses] = React.useState<LectureToday[]>([]);
  const [assignments, setAssignments] = React.useState<UpcomingAssignmentItem[]>([]);
  const [summary, setSummary] = React.useState<AcademicSummaryData | null>(null);
  const [loadingClasses, setLoadingClasses] = React.useState(true);
  const [loadingAssignments, setLoadingAssignments] = React.useState(true);

  React.useEffect(() => {
    let summaryUrl = '/api/dashboard/academic-summary';
    if (studentId) {
      summaryUrl += `?studentId=${encodeURIComponent(studentId)}`;
    }
    apiGet<{ success: boolean; data: AcademicSummaryData }>(summaryUrl)
      .then((res) => {
        if (res?.success && res.data) setSummary(res.data);
      })
      .catch(() => {});

    // Today's bounds
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let lecUrl = `/api/lectures?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`;
    if (studentId) {
      lecUrl += `&studentId=${studentId}`;
    }

    apiGet<{ success: boolean; data: { items: LectureToday[] } }>(lecUrl)
      .then((res) => {
        if (res?.success) setClasses(res.data?.items || []);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));

    let assignUrl = `/api/assignments?status=upcoming&limit=5`;
    if (studentId) {
      assignUrl += `&studentId=${studentId}`;
    }

    apiGet<{ success: boolean; data: { items: UpcomingAssignmentItem[] } }>(assignUrl)
      .then((res) => {
        if (res?.success) setAssignments(res.data?.items || []);
      })
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [studentId]);

  return (
    <div className="space-y-6">
      {/* Server Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Classes Today</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.lecturesToday ?? 0}</p>
          </div>
          <Calendar className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">This Week</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.lecturesThisWeek ?? 0}</p>
          </div>
          <Calendar className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Upcoming</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.upcomingAssignments ?? 0}</p>
          </div>
          <Clock className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Overdue</p>
            <p className={`text-xl font-bold mt-0.5 ${summary && summary.overdueAssignments > 0 ? 'text-status-danger-text' : 'text-foreground'}`}>
              {summary?.overdueAssignments ?? 0}
            </p>
          </div>
          <AlertTriangle className="h-6 w-6 text-status-warning-text/40 shrink-0" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <SectionCard
          title="Today's Classes"
          description={`Scheduled sessions for today (${getTimezoneDisplay(tz)})`}
          actions={
            <Link
              href="/lectures"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>All classes</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          }
          noPadding
        >
          {loadingClasses ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : classes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic">
              No classes scheduled for today.
            </div>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {classes.map((cls) => {
                const start = new Date(cls.startsAt);
                const end = new Date(cls.endsAt);
                return (
                  <li
                    key={cls.id}
                    className="p-4 hover:bg-surface-hover/30 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/lectures/${cls.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {cls.title}
                        </Link>
                        <StatusBadge
                          variant={
                            cls.status === 'COMPLETED'
                              ? 'completed'
                              : cls.status === 'CANCELLED'
                              ? 'cancelled'
                              : 'planned'
                          }
                          label={cls.status}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span>{formatCenterTime(start, tz)} – {formatCenterTime(end, tz)}</span>
                        {cls.subject && <span>· {cls.subject.name}</span>}
                        {cls.teacher && <span>· {cls.teacher.name}</span>}
                      </div>
                    </div>

                    {cls.canJoinNow && cls.onlineMeetingUrl && (
                      <a
                        href={cls.onlineMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-[var(--radius-control)] bg-status-success-bg text-status-success-text border border-status-success-border font-bold text-xs inline-flex items-center gap-1 hover:brightness-105 shrink-0"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Upcoming Assignments */}
        <SectionCard
          title="Upcoming Assignments"
          description="Pending homework and coursework due soon"
          actions={
            <Link
              href="/assignments"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>All assignments</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          }
          noPadding
        >
          {loadingAssignments ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic">
              No upcoming assignments due.
            </div>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {assignments.map((a) => {
                const due = new Date(a.dueAt);
                return (
                  <li
                    key={a.id}
                    className="p-4 hover:bg-surface-hover/30 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/assignments/${a.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {a.title}
                      </Link>
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span>Due {formatDate(due, tz)} {formatCenterTime(due, tz)}</span>
                        {a.batch && <span>· {a.batch.name}</span>}
                        <span>· {Number(a.maxMarks)} Marks</span>
                      </div>
                    </div>

                    <Link
                      href={`/assignments/${a.id}`}
                      className="px-2.5 py-1 rounded-[var(--radius-control)] bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-border text-xs font-semibold shrink-0"
                    >
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Syllabus Progress Card */}
      <SyllabusProgressCard compact studentId={studentId} />
    </div>
  );
}

// ─── Teacher: Today's Lectures & Needs Grading ─────────────────────────────

export function TeacherAcademicsCards() {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const [lectures, setLectures] = React.useState<LectureToday[]>([]);
  const [needsGrading, setNeedsGrading] = React.useState<Array<{
    id: string;
    title: string;
    batch?: { name: string };
    counts?: { submitted: number; graded: number };
  }>>([]);
  const [summary, setSummary] = React.useState<AcademicSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiGet<{ success: boolean; data: AcademicSummaryData }>('/api/dashboard/academic-summary')
      .then((res) => {
        if (res?.success && res.data) setSummary(res.data);
      })
      .catch(() => {});

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    Promise.all([
      apiGet<{ success: boolean; data: { items: LectureToday[] } }>(
        `/api/lectures?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`
      ),
      apiGet<{ success: boolean; data: { items: Array<{ id: string; title: string; maxMarks: number; dueAt: string; counts?: { submitted: number; graded: number; missing: number }; batch?: { name: string }; subject?: { name: string } }> } }>(`/api/assignments?limit=20`),
    ])
      .then(([lecRes, assignRes]) => {
        if (lecRes?.success) setLectures(lecRes.data?.items || []);
        if (assignRes?.success) {
          const waiting = (assignRes.data?.items || []).filter(
            (a) => a.counts && a.counts.submitted > 0
          );
          setNeedsGrading(waiting);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Server Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Lectures Today</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.lecturesToday ?? 0}</p>
          </div>
          <Calendar className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">This Week</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.lecturesThisWeek ?? 0}</p>
          </div>
          <Calendar className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Needs Grading</p>
            <p className={`text-xl font-bold mt-0.5 ${summary && summary.needsGrading > 0 ? 'text-status-warning-text' : 'text-foreground'}`}>
              {summary?.needsGrading ?? 0}
            </p>
          </div>
          <ClipboardCheck className="h-6 w-6 text-status-warning-text/40 shrink-0" />
        </div>
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Upcoming Deadlines</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{summary?.upcomingAssignments ?? 0}</p>
          </div>
          <Clock className="h-6 w-6 text-primary/40 shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Today's Lectures */}
      <SectionCard
        title="Today's Lectures"
        description="Lectures assigned to teach today"
        actions={
          <Link
            href="/lectures"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>All lectures</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        }
        noPadding
      >
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : lectures.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground italic">
            No lectures scheduled for you today.
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {lectures.map((lec) => {
              const start = new Date(lec.startsAt);
              const end = new Date(lec.endsAt);
              return (
                <li
                  key={lec.id}
                  className="p-4 hover:bg-surface-hover/30 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/lectures/${lec.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {lec.title}
                    </Link>
                    <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                      <span>{formatCenterTime(start, tz)} – {formatCenterTime(end, tz)}</span>
                      {lec.batch && <span>· {lec.batch.name}</span>}
                    </div>
                  </div>

                  <Link
                    href={`/lectures/${lec.id}`}
                    className="px-2.5 py-1 rounded-[var(--radius-control)] bg-surface-hover text-foreground hover:bg-surface-hover/80 border border-border text-xs font-semibold shrink-0"
                  >
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Needs Grading */}
      <SectionCard
        title="Needs Grading"
        description="Submitted student assignments waiting for marks"
        actions={
          <Link
            href="/assignments"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Assignments</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        }
        noPadding
      >
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : needsGrading.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground italic">
            All submitted assignments are graded! Great job.
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {needsGrading.map((item) => (
              <li
                key={item.id}
                className="p-4 hover:bg-surface-hover/30 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <Link
                    href={`/assignments/${item.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {item.title}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {item.batch?.name || 'Batch'} · {item.counts?.submitted} submission(s) pending
                  </p>
                </div>

                <Link
                  href={`/assignments/${item.id}`}
                  className="px-2.5 py-1 rounded-[var(--radius-control)] bg-status-warning-bg text-status-warning-text border border-status-warning-border font-bold text-xs hover:brightness-105 shrink-0"
                >
                  Grade ({item.counts?.submitted})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      </div>
    </div>
  );
}

// ─── Academics Summary Cards (Server-side Aggregates) ──────────────────────

export interface AcademicSummaryData {
  lecturesToday: number;
  lecturesThisWeek: number;
  overdueAssignments: number;
  needsGrading: number;
  upcomingAssignments: number;
  unreadNotifications: number;
}

export function AdminAcademicsSummaryCard({ branchId }: { branchId?: string }) {
  const [summary, setSummary] = React.useState<AcademicSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let url = '/api/dashboard/academic-summary';
    if (branchId) {
      url += `?branchId=${encodeURIComponent(branchId)}`;
    }

    apiGet<{ success: boolean; data: AcademicSummaryData }>(url)
      .then((res) => {
        if (res?.success && res.data) {
          setSummary(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  return (
    <SectionCard
      title="Academics Summary"
      description="Branch lecture schedules, grading status, and assignment deadlines"
      actions={
        <div className="flex items-center gap-3 text-xs">
          <Link href="/lectures" className="font-semibold text-primary hover:underline">
            Lectures →
          </Link>
          <Link href="/assignments" className="font-semibold text-primary hover:underline">
            Assignments →
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lectures This Week */}
        <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Lectures This Week</p>
            <div className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Skeleton className="h-7 w-12" /> : summary?.lecturesThisWeek ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary ? `${summary.lecturesToday} today` : 'Loading...'}
            </p>
          </div>
          <Calendar className="h-8 w-8 text-primary/40 shrink-0" />
        </div>

        {/* Needs Grading */}
        <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Needs Grading</p>
            <div className={`text-2xl font-bold mt-1 ${summary && summary.needsGrading > 0 ? 'text-status-warning-text' : 'text-foreground'}`}>
              {loading ? <Skeleton className="h-7 w-12" /> : summary?.needsGrading ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Submissions waiting
            </p>
          </div>
          <ClipboardCheck className="h-8 w-8 text-status-warning-text/40 shrink-0" />
        </div>

        {/* Upcoming Assignments */}
        <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Upcoming Assignments</p>
            <div className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Skeleton className="h-7 w-12" /> : summary?.upcomingAssignments ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active student deadlines
            </p>
          </div>
          <Clock className="h-8 w-8 text-primary/40 shrink-0" />
        </div>

        {/* Overdue Assignments */}
        <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overdue Assignments</p>
            <div className={`text-2xl font-bold mt-1 ${summary && summary.overdueAssignments > 0 ? 'text-status-danger-text' : 'text-foreground'}`}>
              {loading ? <Skeleton className="h-7 w-12" /> : summary?.overdueAssignments ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Past deadline
            </p>
          </div>
          <AlertTriangle className="h-8 w-8 text-status-warning-text/40 shrink-0" />
        </div>
      </div>
    </SectionCard>
  );
}
