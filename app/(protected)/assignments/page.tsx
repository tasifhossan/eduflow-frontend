'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  RotateCw,
  Search,
  Clock,
  AlertTriangle,
  ChevronRight,
  User,
  Users,
  BookOpen,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCenterTime } from '@/lib/tz';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { NewAssignmentModal } from '@/components/assignments/new-assignment-modal';

interface AssignmentItem {
  id: string;
  batchId: string;
  subjectId?: string | null;
  lectureId?: string | null;
  title: string;
  instructions: string;
  dueAt: string;
  maxMarks: number | string;
  mode: 'ONLINE' | 'OFFLINE';
  allowLate: boolean;
  publishedAt: string | null;
  createdAt: string;
  batch?: { id: string; name: string };
  subject?: { id: string; name: string };
  lecture?: { id: string; title: string; startsAt: string };
  counts?: {
    enrolled: number;
    submitted: number;
    graded: number;
    missing: number;
  };
  mySubmission?: {
    id: string;
    status: 'SUBMITTED' | 'GRADED' | 'MISSING' | 'DRAFT';
    isLate: boolean;
    marks?: number | string | null;
    feedback?: string | null;
    submittedAt?: string | null;
    gradedAt?: string | null;
  } | null;
}

interface FilterBatch {
  id: string;
  name: string;
  subjectId?: string;
}

interface FilterSubject {
  id: string;
  name: string;
}

interface GuardianChild {
  id: string;
  name: string;
  studentCode?: string;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isGuardian = user?.role === 'GUARDIAN';
  const isStudent = user?.role === 'STUDENT';

  // State
  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Student / Guardian tab filter
  const [studentTab, setStudentTab] = React.useState<'todo' | 'submitted' | 'graded' | 'overdue'>('todo');

  // Guardian Child
  const [children, setChildren] = React.useState<GuardianChild[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');

  // Filters
  const [batches, setBatches] = React.useState<FilterBatch[]>([]);
  const [subjects, setSubjects] = React.useState<FilterSubject[]>([]);
  const [selectedBatch, setSelectedBatch] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedMode, setSelectedMode] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);

  // Load staff filter options and guardian children
  React.useEffect(() => {
    if (isStaff) {
      apiGet<{ success: boolean; data: { items?: FilterBatch[] } }>('/api/tables/batches?limit=100')
        .then((res) => {
          if (res?.data?.items) setBatches(res.data.items);
        })
        .catch(() => {});

      apiGet<{ success: boolean; data: { items?: FilterSubject[] } }>('/api/tables/subjects?limit=100')
        .then((res) => {
          if (res?.data?.items) setSubjects(res.data.items);
        })
        .catch(() => {});
    }

    if (isGuardian) {
      apiGet<{ success: boolean; data: { children?: GuardianChild[] } }>('/api/guardian/children')
        .then((res) => {
          if (res?.data?.children) {
            setChildren(res.data.children);
            if (res.data.children.length > 0) {
              setSelectedChildId((prev) => prev || res.data!.children![0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isStaff, isGuardian]);

  // Load assignments
  const [reloadKey, setReloadKey] = React.useState(0);

  const loadAssignments = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (isGuardian && !selectedChildId) {
        if (active) {
          setAssignments([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', '100');

        if (selectedBatch && selectedBatch !== 'all') {
          params.set('batchId', selectedBatch);
        }

        if (isStaff && selectedStatus !== 'all') {
          params.set('status', selectedStatus);
        }

        if (isGuardian && selectedChildId) {
          params.set('studentId', selectedChildId);
        }

        const res = await apiGet<{ success: boolean; data: { items: AssignmentItem[] } }>(
          `/api/assignments?${params.toString()}`
        );

        if (!active) return;
        if (res?.success) {
          setAssignments(res.data?.items || []);
          setError(null);
        } else {
          setError('Failed to retrieve assignments');
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error fetching assignments');
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
  }, [isStaff, isGuardian, selectedChildId, selectedBatch, selectedStatus, reloadKey]);

  // Filtered items
  const filteredAssignments = React.useMemo(() => {
    let list = assignments;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.batch?.name.toLowerCase().includes(q) ||
          a.subject?.name.toLowerCase().includes(q) ||
          a.instructions.toLowerCase().includes(q)
      );
    }

    if (selectedMode !== 'all') {
      list = list.filter((a) => a.mode === selectedMode);
    }

    if (isStudent || isGuardian) {
      const now = new Date();
      if (studentTab === 'todo') {
        list = list.filter((a) => {
          const hasSubmitted = a.mySubmission && a.mySubmission.status !== 'DRAFT';
          if (hasSubmitted) return false;
          const due = new Date(a.dueAt);
          return due >= now || a.allowLate;
        });
      } else if (studentTab === 'submitted') {
        list = list.filter((a) => a.mySubmission?.status === 'SUBMITTED');
      } else if (studentTab === 'graded') {
        list = list.filter((a) => a.mySubmission?.status === 'GRADED');
      } else if (studentTab === 'overdue') {
        list = list.filter((a) => {
          const hasSubmitted = a.mySubmission && a.mySubmission.status !== 'DRAFT';
          if (hasSubmitted) return false;
          const due = new Date(a.dueAt);
          return due < now && !a.allowLate;
        });
      }
    }

    return list;
  }, [assignments, searchQuery, selectedMode, isStudent, isGuardian, studentTab]);

  // Staff summary counts
  const staffCounts = React.useMemo(() => {
    const totalAssignments = assignments.length;
    let totalSubmitted = 0;
    let totalGraded = 0;
    let totalMissing = 0;

    for (const a of assignments) {
      if (a.counts) {
        totalSubmitted += a.counts.submitted;
        totalGraded += a.counts.graded;
        totalMissing += a.counts.missing;
      }
    }

    return { totalAssignments, totalSubmitted, totalGraded, totalMissing };
  }, [assignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isStudent ? 'My Assignments' : isGuardian ? "Child's Assignments" : 'Assignments'}
        description={
          isStudent
            ? 'View coursework deadlines, instructions, submit files, and review grades'
            : isGuardian
            ? "Track assigned homework, submissions, marks, and teacher's feedback"
            : 'Manage homework, essay assignments, offline marks entry, and student submissions'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAssignments}
              disabled={isLoading}
              title="Refresh list"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
            </Button>

            {isStaff && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Assignment
              </Button>
            )}
          </div>
        }
      />

      {/* Guardian child selector banner */}
      {isGuardian && (
        <div className="p-4 rounded-[var(--radius-card)] border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">Select Student:</span>
          </div>
          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No linked children found for your account.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium transition-colors border ${
                    selectedChildId === child.id
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-foreground border-border'
                  }`}
                >
                  {child.name}
                  {child.studentCode ? ` (${child.studentCode})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Counts Banner */}
      {isStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Assignments</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{staffCounts.totalAssignments}</p>
          </div>

          <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Submitted</span>
              <Clock className="h-4 w-4 text-status-warning-text" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{staffCounts.totalSubmitted}</p>
          </div>

          <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Graded</span>
              <CheckCircle2 className="h-4 w-4 text-status-success-text" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{staffCounts.totalGraded}</p>
          </div>

          <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Missing</span>
              <AlertTriangle className="h-4 w-4 text-status-danger-text" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{staffCounts.totalMissing}</p>
          </div>
        </div>
      )}

      {/* Student / Guardian Tabs */}
      {(isStudent || isGuardian) && (
        <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
          {(
            [
              { id: 'todo', label: 'To do' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'graded', label: 'Graded' },
              { id: 'overdue', label: 'Overdue' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStudentTab(tab.id)}
              className={`px-4 py-2 rounded-t-[var(--radius-control)] text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                studentTab === tab.id
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments by title, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isStaff && (
            <>
              <div className="w-36">
                <Select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-32">
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Drafts</option>
                </Select>
              </div>
            </>
          )}

          <div className="w-32">
            <Select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[var(--radius-card)] border border-border bg-surface space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load assignments"
          message={error}
          onRetry={loadAssignments}
        />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6 stroke-[1.5]" />}
          title="No assignments found"
          description={
            isStaff
              ? 'No assignments match the selected filters. Click New Assignment to post coursework.'
              : isStudent || isGuardian
              ? `No assignments currently in "${studentTab}".`
              : 'No assignments available.'
          }
          action={
            isStaff ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create First Assignment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assign) => {
            const isDraft = !assign.publishedAt;
            const dueDate = new Date(assign.dueAt);
            const isPastDue = dueDate < new Date();

            return (
              <div
                key={assign.id}
                className="p-4 rounded-[var(--radius-card)] border border-border bg-surface hover:border-primary/40 transition-colors shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info block */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/assignments/${assign.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-sm truncate"
                    >
                      {assign.title}
                    </Link>

                    {isStaff ? (
                      isDraft ? (
                        <StatusBadge variant="draft" label="Draft" />
                      ) : (
                        <StatusBadge variant="planned" label="Published" />
                      )
                    ) : assign.mySubmission ? (
                      assign.mySubmission.status === 'GRADED' ? (
                        <StatusBadge variant="graded" label="Graded" />
                      ) : (
                        <StatusBadge variant="submitted" label="Submitted" />
                      )
                    ) : isPastDue ? (
                      <StatusBadge variant="overdue" label="Overdue" />
                    ) : (
                      <StatusBadge variant="planned" label="To do" />
                    )}

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-control)] bg-surface-hover text-muted-foreground border border-border">
                      {assign.mode === 'ONLINE' ? 'Online Submission' : 'Offline / In-Class'}
                    </span>

                    {assign.allowLate && (
                      <span className="text-[10px] font-medium text-status-warning-text bg-status-warning-bg border border-status-warning-border px-1.5 py-0.5 rounded-[var(--radius-control)]">
                        Late Allowed
                      </span>
                    )}
                  </div>

                  {/* Batch & Subject & Lecture details */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {assign.batch && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{assign.batch.name}</span>
                      </span>
                    )}
                    {assign.subject && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{assign.subject.name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{Number(assign.maxMarks)} Marks</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Due: {formatDate(dueDate, tz)} {formatCenterTime(dueDate, tz)}</span>
                    </span>
                  </div>

                  {/* Instructions Preview */}
                  {assign.instructions && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                      {assign.instructions}
                    </p>
                  )}
                </div>

                {/* Right side stats & action */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
                  {isStaff && assign.counts && (
                    <div className="flex items-center gap-3 text-center">
                      <div className="px-2 py-1 rounded-[var(--radius-control)] bg-surface-hover/50">
                        <p className="text-[11px] text-muted-foreground">Submitted</p>
                        <p className="text-xs font-bold text-foreground">{assign.counts.submitted}</p>
                      </div>
                      <div className="px-2 py-1 rounded-[var(--radius-control)] bg-surface-hover/50">
                        <p className="text-[11px] text-muted-foreground">Graded</p>
                        <p className="text-xs font-bold text-status-success-text">{assign.counts.graded}</p>
                      </div>
                      <div className="px-2 py-1 rounded-[var(--radius-control)] bg-surface-hover/50">
                        <p className="text-[11px] text-muted-foreground">Missing</p>
                        <p className="text-xs font-bold text-status-danger-text">{assign.counts.missing}</p>
                      </div>
                    </div>
                  )}

                  {(isStudent || isGuardian) && assign.mySubmission && assign.mySubmission.status === 'GRADED' && (
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Marks Awarded</span>
                      <span className="text-sm font-bold text-status-success-text">
                        {assign.mySubmission.marks !== null && assign.mySubmission.marks !== undefined
                          ? Number(assign.mySubmission.marks)
                          : '—'}{' '}
                        / {Number(assign.maxMarks)}
                      </span>
                    </div>
                  )}

                  <Link href={`/assignments/${assign.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <span>View</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Assignment Modal */}
      {isNewModalOpen && (
        <NewAssignmentModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => {
            loadAssignments();
          }}
          batches={batches}
          subjects={subjects}
        />
      )}
    </div>
  );
}
