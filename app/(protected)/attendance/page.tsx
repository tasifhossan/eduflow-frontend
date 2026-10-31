'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  TrendingDown,
  Loader2,
  Save,
  Users,
  BellRing,
  UserCheck,
} from 'lucide-react';
import { apiGet, apiPost, ApiResponse } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { utcToCenterDateInput } from '@/lib/tz';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Types
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface BatchItem {
  id: string;
  name: string;
  type?: string;
  teacherId?: string;
}

interface StudentRosterItem {
  id: string;
  name: string;
  studentCode?: string | null;
  status: AttendanceStatus;
  alertedAt?: string | null;
}

interface StudentSummaryData {
  student: {
    id: string;
    name: string;
    studentCode?: string | null;
  };
  monthPercent: number;
  overallPercent: number;
  totals: {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  recentRecords: Array<{
    date: string;
    status: AttendanceStatus;
    batchName: string;
  }>;
  linkedChildren?: Array<{
    id: string;
    name: string;
    studentCode?: string | null;
  }>;
}

export default function AttendancePage() {
  const { user } = useAuth();

  const isStudentOrGuardian = user?.role === 'STUDENT' || user?.role === 'GUARDIAN';

  if (!user) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {isStudentOrGuardian ? (
        <StudentGuardianAttendanceView />
      ) : (
        <StaffAttendanceMarkingView />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ATTENDANCE MARKING VIEW
// ─────────────────────────────────────────────────────────────────────────────

function StaffAttendanceMarkingView() {
  const { user } = useAuth();
  const { center } = useCenter();
  const timezone = center.timezone || 'Asia/Dhaka';
  const todayStr = React.useMemo(() => utcToCenterDateInput(new Date(), timezone), [timezone]);

  // Center policy values
  const attendanceAlertsOn = center.features?.attendanceAlerts !== false;
  // If center settings has attendancePolicy, use it; fallback to defaults
  const editWindowDays = 7;
  const alertOnLate = false;

  // Batch & Date selection
  const [batches, setBatches] = React.useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [loadingBatches, setLoadingBatches] = React.useState<boolean>(true);

  // Roster & Marking state
  const [roster, setRoster] = React.useState<StudentRosterItem[]>([]);
  const [initialRoster, setInitialRoster] = React.useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [isAlreadyMarked, setIsAlreadyMarked] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load available batches
  React.useEffect(() => {
    let active = true;
    async function loadBatches() {
      try {
        const res = await apiGet<ApiResponse<{ items: BatchItem[] }>>('/api/tables/batches?limit=100');
        if (!active) return;
        if (res.success && res.data?.items) {
          const list = res.data.items;
          setBatches(list);
          if (list.length > 0) {
            setSelectedBatchId(list[0].id);
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load batches');
      } finally {
        if (active) setLoadingBatches(false);
      }
    }
    loadBatches();
    return () => {
      active = false;
    };
  }, []);

  // Compute edit window difference in days
  const isTeacherLocked = React.useMemo(() => {
    if (user?.role !== 'TEACHER') return false;
    if (!selectedDate) return false;
    const now = new Date(todayStr + 'T00:00:00.000Z');
    const target = new Date(selectedDate + 'T00:00:00.000Z');
    const diffDays = Math.floor((now.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays > editWindowDays;
  }, [user?.role, selectedDate, todayStr, editWindowDays]);

  // Unsaved changes check
  const isDirty = React.useMemo(() => {
    if (roster.length === 0 || initialRoster.length === 0) return false;
    if (roster.length !== initialRoster.length) return true;
    for (let i = 0; i < roster.length; i++) {
      if (roster[i].status !== initialRoster[i]?.status) return true;
    }
    return false;
  }, [roster, initialRoster]);

  // Guard window unload when dirty
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load students and existing records when batch or date changes
  const refreshAttendance = React.useCallback(async (batchId: string, date: string) => {
    if (!batchId || !date) return;
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        apiGet<ApiResponse<Array<{ id: string; name: string; studentCode?: string | null }>>>(
          `/api/batches/${batchId}/students`
        ),
        apiGet<
          ApiResponse<
            Array<{
              id: string;
              studentId: string;
              status: AttendanceStatus;
              alertedAt?: string | null;
              createdAt?: string;
            }>
          >
        >(`/api/batches/${batchId}/attendance?date=${date}`),
      ]);

      const students = studentsRes.success && Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const records = attendanceRes.success && Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

      const recordMap = new Map(records.map((r) => [r.studentId, r]));
      setIsAlreadyMarked(records.length > 0);

      const builtRoster: StudentRosterItem[] = students.map((s) => {
        const existing = recordMap.get(s.id);
        return {
          id: s.id,
          name: s.name,
          studentCode: s.studentCode || null,
          status: existing ? existing.status : 'PRESENT',
          alertedAt: existing ? existing.alertedAt : null,
        };
      });

      setRoster(builtRoster);
      setInitialRoster(builtRoster);
      setErrorMsg(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!selectedBatchId || !selectedDate) return;

    async function load() {
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          apiGet<ApiResponse<Array<{ id: string; name: string; studentCode?: string | null }>>>(
            `/api/batches/${selectedBatchId}/students`
          ),
          apiGet<
            ApiResponse<
              Array<{
                id: string;
                studentId: string;
                status: AttendanceStatus;
                alertedAt?: string | null;
                createdAt?: string;
              }>
            >
          >(`/api/batches/${selectedBatchId}/attendance?date=${selectedDate}`),
        ]);

        if (!active) return;
        const students = studentsRes.success && Array.isArray(studentsRes.data) ? studentsRes.data : [];
        const records = attendanceRes.success && Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

        const recordMap = new Map(records.map((r) => [r.studentId, r]));
        setIsAlreadyMarked(records.length > 0);

        const builtRoster: StudentRosterItem[] = students.map((s) => {
          const existing = recordMap.get(s.id);
          return {
            id: s.id,
            name: s.name,
            studentCode: s.studentCode || null,
            status: existing ? existing.status : 'PRESENT',
            alertedAt: existing ? existing.alertedAt : null,
          };
        });

        setRoster(builtRoster);
        setInitialRoster(builtRoster);
        setErrorMsg(null);
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance');
      } finally {
        if (active) setLoadingRoster(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [selectedBatchId, selectedDate]);

  // Handle batch selection change with unsaved confirmation
  const handleBatchChange = (newBatchId: string) => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved attendance changes. Discard and proceed?');
      if (!confirmDiscard) return;
    }
    setLoadingRoster(true);
    setSelectedBatchId(newBatchId);
  };

  // Handle date selection change with unsaved confirmation
  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved attendance changes. Discard and proceed?');
      if (!confirmDiscard) return;
    }
    setLoadingRoster(true);
    setSelectedDate(newDate);
  };

  // One-tap status updates
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    if (isTeacherLocked) return;
    setRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  // Bulk set all
  const markAll = (status: AttendanceStatus) => {
    if (isTeacherLocked) return;
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
  };

  // Summary counts
  const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
  const absentCount = roster.filter((r) => r.status === 'ABSENT').length;
  const lateCount = roster.filter((r) => r.status === 'LATE').length;
  const excusedCount = roster.filter((r) => r.status === 'EXCUSED').length;

  const pendingAlertCount = attendanceAlertsOn
    ? roster.filter(
        (r) =>
          (r.status === 'ABSENT' || (alertOnLate && r.status === 'LATE')) &&
          !r.alertedAt
      ).length
    : 0;

  // Save attendance
  const handleSave = async () => {
    if (!selectedBatchId || !selectedDate || isTeacherLocked || roster.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        batchId: selectedBatchId,
        date: selectedDate,
        records: roster.map((r) => ({
          studentId: r.id,
          status: r.status,
        })),
      };

      const res = await apiPost<ApiResponse<{ count: number }>>('/api/attendance', payload);
      if (res.success) {
        toast.success(
          isAlreadyMarked
            ? 'Attendance updated successfully'
            : 'Attendance recorded successfully'
        );
        await refreshAttendance(selectedBatchId, selectedDate);
      } else {
        toast.error(res.message || 'Failed to save attendance');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Attendance Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record daily batch attendance, notify guardians on absences, and review history.
          </p>
        </div>

        {/* Sub-navigation pills */}
        <div className="flex items-center gap-2">
          <Link href="/attendance/low">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <TrendingDown className="h-4 w-4 text-warning" />
              Low Attendance
            </Button>
          </Link>
          <Link href="/attendance/sheet">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Monthly Sheet
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Card: Batch & Date Pickers */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Select Batch
            </label>
            {loadingBatches ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : batches.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">No batches assigned or found</div>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Class Date ({timezone})
            </label>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Quick Mark-All Buttons */}
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAll('PRESENT')}
              disabled={isTeacherLocked || roster.length === 0}
              className="h-10 text-xs flex-1 border-secondary/30 text-secondary hover:bg-secondary-subtle"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Mark All Present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAll('ABSENT')}
              disabled={isTeacherLocked || roster.length === 0}
              className="h-10 text-xs flex-1 border-danger/30 text-danger hover:bg-danger-subtle"
            >
              Mark All Absent
            </Button>
          </div>
        </div>

        {/* Informative Banners */}
        {isTeacherLocked && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-warning/30 bg-warning-subtle text-warning-foreground text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <div>
              <span className="font-semibold">Teacher Edit Window Locked: </span>
              This class date exceeds the center&apos;s {editWindowDays}-day teacher editing policy.
              Attendance for this date can only be modified by an administrator.
            </div>
          </div>
        )}

        {isAlreadyMarked && !isTeacherLocked && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-primary/20 bg-primary-subtle text-primary text-xs">
            <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Already Recorded: </span>
              Attendance for this class date has already been saved. Any status changes will be updated and recorded in the audit log.
            </div>
          </div>
        )}
      </div>

      {/* Roster & Table Section */}
      {errorMsg ? (
        <ErrorState message={errorMsg} onRetry={() => refreshAttendance(selectedBatchId, selectedDate)} />
      ) : loadingRoster ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : roster.length === 0 ? (
        <EmptyState
          title="No Students Enrolled"
          description="There are currently no active students enrolled in this batch."
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {/* Table Header & Summary Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border gap-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Enrolled Students ({roster.length})
              </span>
            </div>

            {/* Quick Count Indicators */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-secondary font-medium">{presentCount} Present</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-danger font-medium">{absentCount} Absent</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-warning font-medium">{lateCount} Late</span>
              {excusedCount > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground font-medium">{excusedCount} Excused</span>
                </>
              )}
            </div>
          </div>

          {/* Students List */}
          <div className="divide-y divide-border overflow-x-auto">
            {roster.map((student, idx) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-surface-hover transition-colors gap-3"
              >
                {/* Student Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {student.name}
                    </span>
                    {student.studentCode && (
                      <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                        {student.studentCode}
                      </Badge>
                    )}
                    {student.alertedAt && (
                      <Badge variant="secondary" size="sm" className="gap-1 text-[10px]">
                        <BellRing className="h-2.5 w-2.5" />
                        Alert sent
                      </Badge>
                    )}
                  </div>
                </div>

                {/* One-Tap Status Buttons */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  role="radiogroup"
                  aria-label={`Attendance status for ${student.name}`}
                >
                  {/* Present Button */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'PRESENT'}
                    disabled={isTeacherLocked}
                    onClick={() => setStudentStatus(student.id, 'PRESENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      student.status === 'PRESENT'
                        ? 'bg-secondary text-secondary-foreground border-secondary shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-secondary/40'
                    }`}
                  >
                    P<span className="hidden sm:inline">resent</span>
                  </button>

                  {/* Absent Button */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'ABSENT'}
                    disabled={isTeacherLocked}
                    onClick={() => setStudentStatus(student.id, 'ABSENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      student.status === 'ABSENT'
                        ? 'bg-danger text-danger-foreground border-danger shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-danger/40'
                    }`}
                  >
                    A<span className="hidden sm:inline">bsent</span>
                  </button>

                  {/* Late Button */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'LATE'}
                    disabled={isTeacherLocked}
                    onClick={() => setStudentStatus(student.id, 'LATE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      student.status === 'LATE'
                        ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-accent/40'
                    }`}
                  >
                    L<span className="hidden sm:inline">ate</span>
                  </button>

                  {/* Excused Button */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={student.status === 'EXCUSED'}
                    disabled={isTeacherLocked}
                    onClick={() => setStudentStatus(student.id, 'EXCUSED')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      student.status === 'EXCUSED'
                        ? 'bg-muted text-foreground border-border shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    E<span className="hidden sm:inline">xcused</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Confirmation Summary Footer */}
          <div className="p-4 sm:p-5 border-t border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              {pendingAlertCount > 0 ? (
                <div className="flex items-center gap-1.5 text-warning-foreground font-medium">
                  <BellRing className="h-3.5 w-3.5 text-warning" />
                  <span>
                    Saving will notify guardians of {pendingAlertCount} student(s) marked absent via in-app & email.
                  </span>
                </div>
              ) : (
                <span>
                  Summary: {presentCount} Present, {absentCount} Absent, {lateCount} Late
                  {excusedCount > 0 ? `, ${excusedCount} Excused` : ''}.
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isTeacherLocked || saving || roster.length === 0}
              className="gap-2 text-xs font-semibold shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isAlreadyMarked ? 'Update Attendance' : 'Save Attendance'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT & GUARDIAN ATTENDANCE VIEW
// ─────────────────────────────────────────────────────────────────────────────

function StudentGuardianAttendanceView() {
  const { user } = useAuth();
  const isGuardian = user?.role === 'GUARDIAN';

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>('');
  const [data, setData] = React.useState<StudentSummaryData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const refreshSummary = React.useCallback(async (studentId?: string) => {
    setLoading(true);
    try {
      const url = studentId
        ? `/api/my/attendance/summary?studentId=${studentId}`
        : '/api/my/attendance/summary';
      const res = await apiGet<ApiResponse<StudentSummaryData>>(url);
      if (res.success && res.data) {
        setData(res.data);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || 'Failed to load attendance summary');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading attendance details');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const url = selectedStudentId
          ? `/api/my/attendance/summary?studentId=${selectedStudentId}`
          : '/api/my/attendance/summary';
        const res = await apiGet<ApiResponse<StudentSummaryData>>(url);
        if (!active) return;
        if (res.success && res.data) {
          setData(res.data);
          if (!selectedStudentId && res.data.student?.id) {
            setSelectedStudentId(res.data.student.id);
          }
          setErrorMsg(null);
        } else {
          setErrorMsg(res.message || 'Failed to load attendance summary');
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Error loading attendance details');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [selectedStudentId]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={() => refreshSummary(selectedStudentId)} />;
  }

  const totals = data?.totals || { totalClasses: 0, presentCount: 0, absentCount: 0, lateCount: 0 };
  const monthPercent = data?.monthPercent ?? 0;
  const overallPercent = data?.overallPercent ?? 0;
  const recentRecords = data?.recentRecords || [];
  const linkedChildren = data?.linkedChildren || [];

  return (
    <div className="space-y-6">
      {/* Header & Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Attendance Summary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGuardian
              ? 'Track your student’s attendance records, punctuality, and class participation.'
              : 'View your class attendance rate, punctuality history, and records.'}
          </p>
        </div>

        {/* Guardian Child Selector */}
        {isGuardian && linkedChildren.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Select Student:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {linkedChildren.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.studentCode ? `(${c.studentCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month Percent */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            This Month
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{monthPercent}%</span>
            <Badge
              variant={monthPercent >= 75 ? 'secondary' : monthPercent >= 50 ? 'warning' : 'danger'}
              size="sm"
            >
              {monthPercent >= 75 ? 'Good' : monthPercent >= 50 ? 'Average' : 'Low'}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                monthPercent >= 75 ? 'bg-secondary' : monthPercent >= 50 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${Math.min(100, monthPercent)}%` }}
            />
          </div>
        </div>

        {/* Overall Percent */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overall Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{overallPercent}%</span>
            <span className="text-xs text-muted-foreground">Total: {totals.totalClasses} classes</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallPercent)}%` }}
            />
          </div>
        </div>

        {/* Present Count */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Present
          </span>
          <div className="text-3xl font-extrabold text-secondary">{totals.presentCount}</div>
          <span className="text-xs text-muted-foreground">Classes attended on time</span>
        </div>

        {/* Absent & Late */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Absent &amp; Late
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-danger">{totals.absentCount}</span>
            <span className="text-xs text-muted-foreground">absent,</span>
            <span className="text-xl font-bold text-warning">{totals.lateCount}</span>
            <span className="text-xs text-muted-foreground">late</span>
          </div>
          <span className="text-xs text-muted-foreground">Missed or late sessions</span>
        </div>
      </div>

      {/* Recent Attendance Records */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-semibold text-foreground">Recent Class Attendance</h2>
        </div>

        {recentRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No recent attendance records found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentRecords.map((rec, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-surface-hover transition-colors">
                <div>
                  <div className="text-sm font-semibold text-foreground">{rec.batchName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rec.date}</div>
                </div>

                <div>
                  {rec.status === 'PRESENT' && <StatusBadge variant="present" />}
                  {rec.status === 'ABSENT' && <StatusBadge variant="absent" />}
                  {rec.status === 'LATE' && <StatusBadge variant="late" />}
                  {rec.status === 'EXCUSED' && (
                    <Badge variant="neutral" size="sm">
                      Excused
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
