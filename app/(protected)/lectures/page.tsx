'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  RotateCw,
  Video,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  BookOpen,
  User,
  Users,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatCenterTime, formatDate } from '@/lib/tz';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, StatusVariant } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { NewLectureModal } from '@/components/lectures/new-lecture-modal';
import { GenerateRoutineModal } from '@/components/lectures/generate-routine-modal';
import { toast } from 'sonner';

interface LectureItem {
  id: string;
  batchId: string;
  subjectId: string;
  chapterId?: string | null;
  teacherId?: string | null;
  title: string;
  plannedTopics?: string | null;
  coveredTopics?: string | null;
  homeworkNote?: string | null;
  startsAt: string;
  endsAt: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  isPublished: boolean;
  onlineProvider?: 'NONE' | 'GOOGLE_MEET' | 'ZOOM' | 'OTHER';
  onlineMeetingUrl?: string | null;
  onlineMeetingId?: string | null;
  onlineMeetingPasscode?: string | null;
  canJoinNow?: boolean;
  joinOpensAt?: string | null;
  batch?: { id: string; name: string };
  subject?: { id: string; name: string };
  teacher?: { id: string; name: string };
  chapter?: { id: string; title: string };
}

interface FilterBatch {
  id: string;
  name: string;
  subjectId?: string;
  teacherId?: string;
}

interface FilterSubject {
  id: string;
  name: string;
}

interface FilterTeacher {
  id: string;
  name: string;
}

interface GuardianChild {
  id: string;
  name: string;
  studentCode?: string;
}

export default function LecturesPage() {
  const { user } = useAuth();
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isGuardian = user?.role === 'GUARDIAN';
  const isStudent = user?.role === 'STUDENT';

  // Filters & State
  const [viewMode, setViewMode] = React.useState<'calendar' | 'agenda'>('calendar');
  const [studentTimeFilter, setStudentTimeFilter] = React.useState<'today' | 'week'>('today');
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');
  const [children, setChildren] = React.useState<GuardianChild[]>([]);

  // Current week anchor for staff calendar (Sunday to Saturday or Monday to Sunday)
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Filter dropdown states
  const [batchFilter, setBatchFilter] = React.useState('');
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [subjectFilter, setSubjectFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  // Dropdown options
  const [batches, setBatches] = React.useState<FilterBatch[]>([]);
  const [subjects, setSubjects] = React.useState<FilterSubject[]>([]);
  const [teachers, setTeachers] = React.useState<FilterTeacher[]>([]);

  // Data states
  const [lectures, setLectures] = React.useState<LectureItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);

  // Copied passcode tracking
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Compute week bounds using center.weekStartsOn (default 6 = Saturday)
  const weekStartsOn = typeof center?.weekStartsOn === 'number' ? center.weekStartsOn : 6;

  const { weekStart, weekEnd, weekDays } = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day - weekStartsOn + 7) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff + weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return {
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      weekDays: days,
    };
  }, [weekOffset, weekStartsOn]);

  // Load filter options and guardian children
  React.useEffect(() => {
    if (isStaff) {
      apiGet<{ success: boolean; data: { items?: Array<{ id: string; name: string; subjectId?: string; teacherId?: string }> } }>('/api/tables/batches?limit=100')
        .then((res) => {
          if (res?.data?.items) setBatches(res.data.items);
        })
        .catch(() => {});

      apiGet<{ success: boolean; data: { items?: Array<{ id: string; name: string }> } }>('/api/tables/subjects?limit=100')
        .then((res) => {
          if (res?.data?.items) setSubjects(res.data.items);
        })
        .catch(() => {});

      apiGet<{ success: boolean; data: { items?: Array<{ id: string; name: string }> } }>('/api/tables/teachers?limit=100')
        .then((res) => {
          if (res?.data?.items) setTeachers(res.data.items);
        })
        .catch(() => {});
    }

    if (isGuardian) {
      apiGet<{ success: boolean; data: { children?: GuardianChild[] } }>('/api/guardian/children')
        .then((res) => {
          if (res?.data?.children) {
            setChildren(res.data.children);
            if (res.data.children.length > 0) {
              setSelectedChildId(res.data.children[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isStaff, isGuardian]);

  // Fetch lectures based on role and active filters
  const [reloadKey, setReloadKey] = React.useState(0);

  const fetchLectures = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        const params = new URLSearchParams();

        if (isStaff) {
          if (batchFilter) params.append('batchId', batchFilter);
          if (teacherFilter) params.append('teacherId', teacherFilter);
          if (subjectFilter) params.append('subjectId', subjectFilter);
          if (statusFilter) params.append('status', statusFilter);
          params.append('from', weekStart);
          params.append('to', weekEnd);
        } else {
          // Student or Guardian
          const now = new Date();
          if (studentTimeFilter === 'today') {
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(now);
            endOfToday.setHours(23, 59, 59, 999);
            params.append('from', startOfToday.toISOString());
            params.append('to', endOfToday.toISOString());
          } else {
            // This week
            params.append('from', weekStart);
            params.append('to', weekEnd);
          }
          if (isGuardian && selectedChildId) {
            params.append('studentId', selectedChildId);
          }
        }

        const res = await apiGet<{ success: boolean; data: { items?: LectureItem[] } | LectureItem[] }>(
          `/api/lectures?${params.toString()}`
        );
        if (!active) return;
        if (res?.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
          setLectures(list);
          setError(null);
        } else {
          setError('Failed to load lectures');
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load lectures';
        setError(msg);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    isStaff,
    isGuardian,
    selectedChildId,
    batchFilter,
    teacherFilter,
    subjectFilter,
    statusFilter,
    weekStart,
    weekEnd,
    studentTimeFilter,
    reloadKey,
  ]);

  const handleCopyPasscode = (lecId: string, passcode: string) => {
    navigator.clipboard.writeText(passcode);
    setCopiedId(lecId);
    toast.success('Meeting passcode copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusVariant = (status: string): StatusVariant => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'CANCELLED') return 'cancelled';
    return 'planned';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={isStaff ? 'Lectures & Routine' : 'My Classes'}
        description={
          isStaff
            ? 'Schedule lectures, generate timetables from routine, and manage live classes'
            : 'View your scheduled lectures, class topics, homework, and join live sessions'
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lectures' },
        ]}
        actions={
          isStaff ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateModalOpen(true)}
                className="gap-1.5"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                <span>Generate from Routine</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>New Lecture</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Top Filter & View Controls */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm space-y-3">
        {isStaff ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border rounded-[var(--radius-control)] bg-surface-hover/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setWeekOffset((p) => p - 1)}
                  aria-label="Previous week"
                  className="p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((p) => p + 1)}
                  aria-label="Next week"
                  className="p-1.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span className="text-xs font-semibold text-muted-foreground">
                {formatDate(weekDays[0], tz)} – {formatDate(weekDays[6], tz)}
              </span>
            </div>

            {/* View Toggle (Calendar vs Agenda) */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="hidden sm:flex items-center border border-border rounded-[var(--radius-control)] p-0.5 bg-surface-hover/30">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'calendar'
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('agenda')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'agenda'
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ListIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Agenda</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Student / Guardian View Mode */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudentTimeFilter('today')}
                className={`px-3.5 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors ${
                  studentTimeFilter === 'today'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                Today&apos;s Classes
              </button>
              <button
                type="button"
                onClick={() => setStudentTimeFilter('week')}
                className={`px-3.5 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors ${
                  studentTimeFilter === 'week'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                This Week
              </button>
            </div>

            {/* Guardian Child Selector */}
            {isGuardian && children.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Child:
                </label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="h-9 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.studentCode ? `(${c.studentCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Staff Dropdown Filters */}
        {isStaff && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              aria-label="Filter by Batch"
              className="h-8 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter by Subject"
              className="h-8 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              aria-label="Filter by Teacher"
              className="h-8 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="h-8 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-[var(--radius-card)]" />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load lectures"
          message={error}
          onRetry={fetchLectures}
        />
      ) : lectures.length === 0 ? (
        <EmptyState
          icon={<Video className="h-6 w-6 stroke-[1.5]" />}
          title="No lectures scheduled"
          description={
            isStaff
              ? 'No lectures found for the selected week or filters. Click "New Lecture" or "Generate from Routine" to schedule classes.'
              : 'You have no scheduled lectures for this period.'
          }
          action={
            isStaff ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
              >
                Schedule First Lecture
              </Button>
            ) : undefined
          }
        />
      ) : isStaff && viewMode === 'calendar' ? (
        /* Staff Calendar View: 7 columns (CSS Grid) */
        <div className="hidden sm:grid grid-cols-7 gap-3">
          {weekDays.map((dayDate, dayIdx) => {
            const dateStr = dayDate.toISOString().split('T')[0];
            const dayLectures = lectures.filter((lec) => {
              const lecDateStr = new Date(lec.startsAt).toISOString().split('T')[0];
              return lecDateStr === dateStr;
            });
            const isToday =
              dayDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

            return (
              <div
                key={dayIdx}
                className={`rounded-[var(--radius-card)] border ${
                  isToday
                    ? 'border-primary bg-primary-subtle/10'
                    : 'border-border bg-surface'
                } p-2.5 min-h-[380px] flex flex-col space-y-2`}
              >
                {/* Day Header */}
                <div className="border-b border-border pb-1.5 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    {formatDate(dayDate, undefined, 'en-US', { weekday: 'short' })}
                  </span>
                  <p
                    className={`text-sm font-bold ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {dayDate.getDate()}
                  </p>
                </div>

                {/* Day Lectures */}
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                  {dayLectures.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 italic">
                      No classes
                    </div>
                  ) : (
                    dayLectures.map((lec) => (
                      <Link
                        key={lec.id}
                        href={`/lectures/${lec.id}`}
                        className="block p-2 rounded-[var(--radius-control)] border border-border bg-surface hover:bg-surface-hover hover:border-primary/40 transition-colors space-y-1.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <StatusBadge variant={getStatusVariant(lec.status)}>
                            {lec.status.toLowerCase()}
                          </StatusBadge>
                          {lec.onlineProvider !== 'NONE' && (
                            <span
                              title="Online Class"
                              className="h-4 w-4 rounded-full bg-secondary-subtle text-secondary flex items-center justify-center shrink-0"
                            >
                              <Video className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {lec.title}
                        </p>

                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p className="truncate font-medium">{lec.batch?.name}</p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              {formatCenterTime(lec.startsAt, tz)} - {formatCenterTime(lec.endsAt, tz)}
                            </span>
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Agenda / List View (Used on mobile and for Student/Guardian) */
        <div className="space-y-3">
          {lectures.map((lec) => {
            const hasOnline = lec.onlineProvider && lec.onlineProvider !== 'NONE';

            return (
              <div
                key={lec.id}
                className="p-4 sm:p-5 rounded-[var(--radius-card)] border border-border bg-surface shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                {/* Left: Timing & Class details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={getStatusVariant(lec.status)}>
                      {lec.status.toLowerCase()}
                    </StatusBadge>

                    {hasOnline && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-secondary-subtle text-secondary border border-border">
                        <Video className="h-3 w-3" aria-hidden="true" />
                        <span>Online Live</span>
                      </span>
                    )}

                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>
                        {formatDate(lec.startsAt, tz)} · {formatCenterTime(lec.startsAt, tz)} - {formatCenterTime(lec.endsAt, tz)}
                      </span>
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/lectures/${lec.id}`}
                      className="text-base font-bold text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      {lec.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="font-semibold text-foreground">{lec.batch?.name}</span>
                      </span>
                      {lec.subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lec.subject.name}</span>
                        </span>
                      )}
                      {lec.teacher && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lec.teacher.name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Topics or Homework note */}
                  {(lec.plannedTopics || lec.coveredTopics || lec.homeworkNote) && (
                    <div className="text-xs text-muted-foreground pt-1 space-y-1">
                      {lec.coveredTopics && (
                        <p>
                          <span className="font-semibold text-foreground">Covered:</span>{' '}
                          {lec.coveredTopics}
                        </p>
                      )}
                      {!lec.coveredTopics && lec.plannedTopics && (
                        <p>
                          <span className="font-semibold text-foreground">Topics:</span>{' '}
                          {lec.plannedTopics}
                        </p>
                      )}
                      {lec.homeworkNote && (
                        <p className="p-2 rounded-[var(--radius-control)] bg-surface-hover/50 border border-border text-foreground">
                          <span className="font-semibold">Homework:</span> {lec.homeworkNote}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Join controls or Detail Button */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                  {/* Online Join button for Students */}
                  {hasOnline && isStudent && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {lec.canJoinNow && lec.onlineMeetingUrl ? (
                        <a
                          href={lec.onlineMeetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-control)] bg-secondary text-secondary-foreground hover:bg-secondary-hover font-semibold text-xs transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Video className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Join Class</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground px-3 py-1.5 rounded-[var(--radius-control)] bg-muted/60 border border-border">
                          Opens at {lec.joinOpensAt ? formatCenterTime(lec.joinOpensAt, tz) : 'scheduled time'}
                        </span>
                      )}

                      {/* Passcode with Copy button (only during join window) */}
                      {lec.canJoinNow && lec.onlineMeetingPasscode && (
                        <button
                          type="button"
                          onClick={() => handleCopyPasscode(lec.id, lec.onlineMeetingPasscode!)}
                          aria-label="Copy meeting passcode"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-control)] border border-border bg-surface hover:bg-surface-hover text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {copiedId === lec.id ? (
                            <>
                              <Check className="h-3 w-3 text-secondary" />
                              <span className="text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px]">{lec.onlineMeetingPasscode}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Detail link */}
                  <Link
                    href={`/lectures/${lec.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-[var(--radius-control)] border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>View details</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Modals */}
      {isStaff && (
        <>
          <NewLectureModal
            isOpen={isNewModalOpen}
            onClose={() => setIsNewModalOpen(false)}
            onSuccess={() => fetchLectures()}
            batches={batches}
            subjects={subjects}
            teachers={teachers}
            currentUserId={user?.id}
            currentUserRole={user?.role}
          />

          <GenerateRoutineModal
            isOpen={isGenerateModalOpen}
            onClose={() => setIsGenerateModalOpen(false)}
            onSuccess={() => fetchLectures()}
            batches={batches}
          />
        </>
      )}
    </div>
  );
}
