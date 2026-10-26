'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCw,
  Search,
  Trash2,
  Send,
  Eye,
  Paperclip,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatDate, formatCenterTime, getTimezoneDisplay } from '@/lib/tz';
import { uploadToCloudinary, getUploadLimits, type UploadLimits } from '@/lib/upload';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { GradingDrawer, SubmissionToGrade } from '@/components/assignments/grading-drawer';
import { OfflineMarksGrid } from '@/components/assignments/offline-marks-grid';
import { toast } from 'sonner';

interface AssignmentDetail {
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
  batch?: { id: string; name: string; branchId: string; teacherId?: string };
  subject?: { id: string; name: string };
  lecture?: { id: string; title: string; startsAt: string };
  attachments?: Array<{
    id: string;
    title: string;
    kind: 'FILE' | 'LINK';
    url?: string | null;
    format?: string | null;
    bytes?: number | null;
    originalName?: string | null;
    createdAt: string;
  }>;
  mySubmission?: {
    id: string;
    status: 'SUBMITTED' | 'GRADED' | 'MISSING' | 'DRAFT';
    isLate: boolean;
    marks?: number | string | null;
    feedback?: string | null;
    textAnswer?: string | null;
    submittedAt?: string | null;
    gradedAt?: string | null;
    attachments?: Array<{
      id: string;
      title: string;
      kind: string;
      format?: string | null;
      bytes?: number | null;
      originalName?: string | null;
      createdAt: string;
    }>;
  } | null;
}

interface SubmissionItem {
  id: string;
  studentId: string;
  status: string;
  isLate: boolean;
  textAnswer?: string | null;
  marks?: number | string | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  student?: {
    id: string;
    name: string;
    studentCode?: string;
    email?: string;
    phone?: string;
  };
  gradedBy?: {
    id: string;
    name: string;
  };
  attachments?: Array<{
    id: string;
    title: string;
    kind: string;
    format?: string | null;
    bytes?: number | null;
    originalName?: string | null;
    createdAt: string;
  }>;
}

interface MissingItem {
  status: 'MISSING';
  student: {
    id: string;
    name: string;
    studentCode?: string;
    email?: string;
    phone?: string;
  };
}

interface UploadFileState {
  id: string;
  file: File;
  progress: number;
  publicId?: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const assignmentId = params.id as string;
  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isGuardian = user?.role === 'GUARDIAN';
  const isStudent = user?.role === 'STUDENT';

  // Guardian child param if passed
  const guardianStudentId = searchParams.get('studentId') || '';

  // Main State
  const [assignment, setAssignment] = React.useState<AssignmentDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Staff Tabs
  const [staffTab, setStaffTab] = React.useState<'submissions' | 'missing' | 'instructions'>('submissions');
  const [submissions, setSubmissions] = React.useState<SubmissionItem[]>([]);
  const [missingList, setMissingList] = React.useState<MissingItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = React.useState(false);
  const [submissionFilter, setSubmissionFilter] = React.useState<string>('ALL');
  const [submissionSearch, setSubmissionSearch] = React.useState<string>('');

  // Grading Drawer
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = React.useState<SubmissionToGrade | null>(null);
  const [isGradingDrawerOpen, setIsGradingDrawerOpen] = React.useState(false);

  // Student Submission Form
  const [isResubmitting, setIsResubmitting] = React.useState(false);
  const [studentText, setStudentText] = React.useState('');
  const [stagedFiles, setStagedFiles] = React.useState<UploadFileState[]>([]);
  const [isSubmittingWork, setIsSubmittingWork] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Load assignment details
  const [reloadKey, setReloadKey] = React.useState(0);

  const loadAssignment = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        let url = `/api/assignments/${assignmentId}`;
        if (isGuardian && guardianStudentId) {
          url += `?studentId=${guardianStudentId}`;
        }

        const res = await apiGet<{ success: boolean; data: AssignmentDetail }>(url);
        if (!active) return;
        if (res?.success && res.data) {
          setAssignment(res.data);
          setError(null);
        } else {
          setError('Assignment not found');
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error loading assignment');
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
  }, [assignmentId, isGuardian, guardianStudentId, reloadKey]);

  // Load staff submissions
  const [submissionsReloadKey, setSubmissionsReloadKey] = React.useState(0);

  const loadStaffSubmissions = React.useCallback(() => {
    setSubmissionsLoading(true);
    setSubmissionsReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    if (!isStaff || assignment?.mode !== 'ONLINE') return;
    let active = true;

    async function loadSubmissions() {
      try {
        if (staffTab === 'submissions') {
          let url = `/api/assignments/${assignmentId}/submissions?limit=100`;
          if (submissionFilter !== 'ALL') {
            url += `&status=${submissionFilter}`;
          }
          const res = await apiGet<{ success: boolean; data: { items: SubmissionItem[] } }>(url);
          if (!active) return;
          if (res?.success) {
            setSubmissions(res.data?.items || []);
          }
        } else if (staffTab === 'missing') {
          const res = await apiGet<{ success: boolean; data: { items: MissingItem[] } }>(
            `/api/assignments/${assignmentId}/submissions?status=MISSING&limit=100`
          );
          if (!active) return;
          if (res?.success) {
            setMissingList(res.data?.items || []);
          }
        }
      } catch {
        if (active) toast.error('Failed to load submissions roster');
      } finally {
        if (active) {
          setSubmissionsLoading(false);
        }
      }
    }

    loadSubmissions();

    return () => {
      active = false;
    };
  }, [assignmentId, isStaff, assignment?.mode, staffTab, submissionFilter, submissionsReloadKey]);

  // Handle Material Download
  const handleDownloadAttachment = async (att: { id: string; kind: string; url?: string | null }) => {
    if (att.kind === 'LINK') {
      if (att.url) window.open(att.url, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloadingId(att.id);
    try {
      const res = await apiGet<{ success: boolean; data: { url: string } }>(
        `/api/attachments/${att.id}/download`
      );
      if (res?.success && res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Download link could not be generated');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  // Dynamic submission upload limits
  const [submissionLimits, setSubmissionLimits] = React.useState<UploadLimits | null>(null);

  React.useEffect(() => {
    getUploadLimits('submission').then(setSubmissionLimits).catch(() => {});
  }, []);

  // Student: Add files for submission
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (stagedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed per assignment submission');
      return;
    }

    const validFiles: File[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (submissionLimits && submissionLimits.allowedFormats.length > 0 && !submissionLimits.allowedFormats.includes(ext)) {
        toast.error(`File "${f.name}" format .${ext || 'unknown'} is not allowed. Allowed formats: ${submissionLimits.allowedFormats.join(', ')}`);
        continue;
      }
      if (submissionLimits && f.size > submissionLimits.maxBytes) {
        toast.error(`File "${f.name}" exceeds maximum allowed size of ${submissionLimits.maxMb}MB`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    const newItems: UploadFileState[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      progress: 0,
      status: 'idle',
    }));

    setStagedFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // Student: Upload single staged file
  const uploadSingleFile = async (item: UploadFileState) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 5 } : f))
    );

    try {
      const result = await uploadToCloudinary({
        purpose: 'submission',
        file: item.file,
        onProgress: (pct) => {
          setStagedFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
          );
        },
      });

      setStagedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: 'done', progress: 100, publicId: result.public_id }
            : f
        )
      );
      return result.public_id;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setStagedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'error', error: errorMsg } : f))
      );
      throw err;
    }
  };

  // Student: Remove staged file
  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Student: Submit assignment
  const handleSubmitAssignment = async () => {
    if (!studentText.trim() && stagedFiles.length === 0) {
      toast.error('Please provide a written response or attach at least one file');
      return;
    }

    setIsSubmittingWork(true);
    try {
      // 1. Upload pending files first
      const uploadedAttachments: Array<{
        publicId: string;
        title: string;
        resourceType: string;
        format: string;
        bytes: number;
        originalName: string;
      }> = [];

      for (const item of stagedFiles) {
        let pubId = item.publicId;
        if (!pubId || item.status !== 'done') {
          pubId = await uploadSingleFile(item);
        }

        const ext = item.file.name.split('.').pop()?.toLowerCase() || '';
        uploadedAttachments.push({
          publicId: pubId,
          title: item.file.name,
          resourceType: 'raw',
          format: ext,
          bytes: item.file.size,
          originalName: item.file.name,
        });
      }

      // 2. Submit payload
      const payload = {
        textAnswer: studentText.trim() || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      };

      const res = await apiPost<{ success: boolean; message: string; data: unknown }>(
        `/api/assignments/${assignmentId}/submit`,
        payload
      );

      if (res?.success) {
        toast.success(
          isResubmitting ? 'Assignment resubmitted successfully!' : 'Assignment submitted successfully!'
        );
        setIsResubmitting(false);
        setStagedFiles([]);
        setStudentText('');
        loadAssignment();
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { code?: string }; message?: string };
      if (apiErr?.data?.code === 'SUBMISSION_CLOSED') {
        toast.error('Submission closed: Deadline passed and late submissions are disallowed');
      } else {
        toast.error(err instanceof Error ? err.message : 'Submission failed');
      }
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Staff: Toggle Publish / Unpublish
  const handleTogglePublish = async () => {
    if (!assignment) return;
    const shouldPublish = !assignment.publishedAt;

    try {
      const res = await apiPatch<{ success: boolean; message: string }>(
        `/api/assignments/${assignment.id}`,
        { published: shouldPublish }
      );
      if (res?.success) {
        toast.success(shouldPublish ? 'Assignment published to students' : 'Assignment unpublished');
        loadAssignment();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update publication status');
    }
  };

  // Staff: Delete Assignment
  const handleDeleteAssignment = async () => {
    if (!assignment) return;
    setIsDeleting(true);
    try {
      const res = await apiDelete<{ success: boolean }>(`/api/assignments/${assignment.id}`);
      if (res?.success) {
        toast.success('Assignment deleted');
        router.push('/assignments');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-36" />
        <div className="p-6 rounded-[var(--radius-card)] border border-border bg-surface space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <ErrorState
        title="Could not display assignment"
        message={error || 'Assignment not found or access denied.'}
        onRetry={loadAssignment}
      />
    );
  }

  const dueDate = new Date(assignment.dueAt);
  const now = new Date();
  const isPastDue = dueDate < now;
  const isSubmissionClosed = isPastDue && !assignment.allowLate;
  const mySub = assignment.mySubmission;
  const isGraded = mySub?.status === 'GRADED';
  const isSubmitted = mySub && mySub.status !== 'DRAFT';

  // Submissions search & filter
  const filteredSubmissions = submissions.filter((s) => {
    if (!submissionSearch.trim()) return true;
    const q = submissionSearch.toLowerCase();
    return (
      s.student?.name?.toLowerCase().includes(q) ||
      s.student?.studentCode?.toLowerCase().includes(q) ||
      s.student?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Assignments</span>
      </Link>

      {/* Main Header Card */}
      <div className="p-5 md:p-6 rounded-[var(--radius-card)] border border-border bg-surface shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {assignment.title}
              </h1>

              {isStaff ? (
                assignment.publishedAt ? (
                  <StatusBadge variant="planned" label="Published" />
                ) : (
                  <StatusBadge variant="draft" label="Draft" />
                )
              ) : isGraded ? (
                <StatusBadge variant="graded" label="Graded" />
              ) : isSubmitted ? (
                <StatusBadge variant="submitted" label="Submitted" />
              ) : isPastDue ? (
                <StatusBadge variant="overdue" label="Overdue" />
              ) : (
                <StatusBadge variant="planned" label="To do" />
              )}

              <span className="text-xs font-medium px-2 py-0.5 rounded-[var(--radius-control)] bg-surface-hover text-muted-foreground border border-border">
                {assignment.mode === 'ONLINE' ? 'Online Submission' : 'Offline / In-Class'}
              </span>

              {assignment.allowLate && (
                <span className="text-[11px] font-medium text-status-warning-text bg-status-warning-bg border border-status-warning-border px-1.5 py-0.5 rounded-[var(--radius-control)]">
                  Late Allowed
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              {assignment.batch && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">{assignment.batch.name}</span>
                </span>
              )}
              {assignment.subject && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>{assignment.subject.name}</span>
                </span>
              )}
              {assignment.lecture && (
                <Link
                  href={`/lectures/${assignment.lecture.id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Lecture: {assignment.lecture.title}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Staff action buttons */}
          {isStaff && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePublish}
              >
                {assignment.publishedAt ? 'Unpublish' : 'Publish to Students'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Metadata bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
          <div className="p-2.5 rounded-[var(--radius-control)] bg-surface-hover/40">
            <span className="text-muted-foreground block text-[11px]">Maximum Marks</span>
            <span className="font-bold text-foreground text-sm">{Number(assignment.maxMarks)}</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-control)] bg-surface-hover/40">
            <span className="text-muted-foreground block text-[11px]">Due Date & Time</span>
            <span className={`font-bold text-sm ${isPastDue ? 'text-status-danger-text' : 'text-foreground'}`}>
              {formatDate(dueDate, tz)} {formatCenterTime(dueDate, tz)}
            </span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-control)] bg-surface-hover/40">
            <span className="text-muted-foreground block text-[11px]">Timezone</span>
            <span className="font-semibold text-foreground text-xs">{getTimezoneDisplay(tz)}</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-control)] bg-surface-hover/40">
            <span className="text-muted-foreground block text-[11px]">Mode</span>
            <span className="font-semibold text-foreground text-xs">
              {assignment.mode === 'ONLINE' ? 'File & Text Upload' : 'Physical Grading'}
            </span>
          </div>
        </div>
      </div>

      {/* STAFF DETAIL VIEW */}
      {isStaff && (
        <div className="space-y-4">
          {/* Staff Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
            <button
              onClick={() => setStaffTab('submissions')}
              className={`px-4 py-2 rounded-t-[var(--radius-control)] text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                staffTab === 'submissions'
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/40'
              }`}
            >
              {assignment.mode === 'OFFLINE' ? 'Offline Marks Grid' : 'Submissions'}
            </button>

            {assignment.mode === 'ONLINE' && (
              <button
                onClick={() => setStaffTab('missing')}
                className={`px-4 py-2 rounded-t-[var(--radius-control)] text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  staffTab === 'missing'
                    ? 'border-primary text-primary bg-surface'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/40'
                }`}
              >
                Missing Roster
              </button>
            )}

            <button
              onClick={() => setStaffTab('instructions')}
              className={`px-4 py-2 rounded-t-[var(--radius-control)] text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                staffTab === 'instructions'
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/40'
              }`}
            >
              Instructions & Materials ({assignment.attachments?.length || 0})
            </button>
          </div>

          {/* Submissions Tab */}
          {staffTab === 'submissions' && (
            assignment.mode === 'OFFLINE' ? (
              <OfflineMarksGrid
                assignmentId={assignment.id}
                totalMarks={Number(assignment.maxMarks)}
                batchId={assignment.batchId}
                onSaved={loadAssignment}
              />
            ) : (
              <div className="space-y-3">
                {/* Search & Filter Bar */}
                <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search submissions by student..."
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <div className="w-36 self-end sm:self-auto">
                    <Select
                      value={submissionFilter}
                      onChange={(e) => setSubmissionFilter(e.target.value)}
                    >
                      <option value="ALL">All Submissions</option>
                      <option value="SUBMITTED">Needs Grading</option>
                      <option value="GRADED">Graded</option>
                    </Select>
                  </div>
                </div>

                {/* Submissions Table */}
                {submissionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-6 w-6 stroke-[1.5]" />}
                    title="No submissions found"
                    description="No student has submitted this assignment matching current filters."
                  />
                ) : (
                  <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-surface-hover/50 text-muted-foreground font-semibold">
                            <th className="p-3">Student Code</th>
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Submitted At</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Marks</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredSubmissions.map((sub) => {
                            const subDate = sub.submittedAt ? new Date(sub.submittedAt) : null;
                            return (
                              <tr key={sub.id} className="hover:bg-surface-hover/30 transition-colors">
                                <td className="p-3 font-mono font-medium text-foreground">
                                  {sub.student?.studentCode || '—'}
                                </td>
                                <td className="p-3 font-semibold text-foreground">
                                  {sub.student?.name || 'Unknown Student'}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {subDate ? `${formatDate(subDate, tz)} ${formatCenterTime(subDate, tz)}` : '—'}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    {sub.status === 'GRADED' ? (
                                      <StatusBadge variant="graded" label="Graded" />
                                    ) : (
                                      <StatusBadge variant="submitted" label="Needs Grading" />
                                    )}
                                    {sub.isLate && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[var(--radius-control)] bg-status-warning-bg text-status-warning-text border border-status-warning-border">
                                        Late
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 font-bold text-foreground">
                                  {sub.marks !== null && sub.marks !== undefined ? (
                                    <span className="text-status-success-text">
                                      {Number(sub.marks)} / {Number(assignment.maxMarks)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground italic">Ungraded</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubmissionToGrade(sub as SubmissionToGrade);
                                      setIsGradingDrawerOpen(true);
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    {sub.status === 'GRADED' ? 'Review & Edit' : 'Grade'}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Missing Tab */}
          {staffTab === 'missing' && (
            <div className="space-y-3">
              {submissionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : missingList.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6 stroke-[1.5]" />}
                  title="All active students submitted!"
                  description="There are no missing submissions for this batch."
                />
              ) : (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
                  <div className="p-3 border-b border-border bg-surface-hover/30 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Missing Submissions ({missingList.length})
                    </span>
                    <span className="text-status-danger-text font-medium">Students yet to submit</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover/50 text-muted-foreground font-semibold">
                        <th className="p-3">Student Code</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {missingList.map((m) => (
                        <tr key={m.student.id} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="p-3 font-mono font-medium text-foreground">
                            {m.student.studentCode || '—'}
                          </td>
                          <td className="p-3 font-semibold text-foreground">{m.student.name}</td>
                          <td className="p-3 text-muted-foreground">{m.student.email || '—'}</td>
                          <td className="p-3 text-muted-foreground">{m.student.phone || '—'}</td>
                          <td className="p-3 text-right">
                            <StatusBadge variant="missing" label="Missing" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Instructions Tab */}
          {staffTab === 'instructions' && (
            <div className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Assignment Instructions & Guidelines
                </h3>
                <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/20 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {assignment.instructions}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Materials & Resource Attachments
                </h3>
                {!assignment.attachments || assignment.attachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No materials attached to this assignment.</p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-[var(--radius-control)] overflow-hidden">
                    {assignment.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-surface hover:bg-surface-hover/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.kind === 'LINK' ? (
                            <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                          )}
                          <span className="font-medium text-foreground truncate">{att.title}</span>
                          {att.format && (
                            <span className="text-[10px] uppercase font-bold text-muted-foreground px-1 py-0.5 rounded bg-surface-hover border border-border">
                              {att.format}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(att)}
                          disabled={downloadingId === att.id}
                        >
                          {downloadingId === att.id ? (
                            <RotateCw className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1" />
                          )}
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT & GUARDIAN VIEW */}
      {(isStudent || isGuardian) && (
        <div className="space-y-6">
          {/* Instructions Card */}
          <div className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Instructions & Requirements</span>
            </h2>

            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-hover/20 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {assignment.instructions}
            </div>

            {/* Materials attachments */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reference Materials & Attachments
                </h4>
                <div className="divide-y divide-border border border-border rounded-[var(--radius-control)] overflow-hidden">
                  {assignment.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-surface hover:bg-surface-hover/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {att.kind === 'LINK' ? (
                          <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate">{att.title}</span>
                        {att.format && (
                          <span className="text-[10px] uppercase font-bold text-muted-foreground px-1 py-0.5 rounded bg-surface-hover border border-border">
                            {att.format}
                          </span>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadAttachment(att)}
                        disabled={downloadingId === att.id}
                      >
                        {downloadingId === att.id ? (
                          <RotateCw className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1" />
                        )}
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Graded Feedback Banner if graded */}
          {isGraded && mySub && (
            <div className="p-5 rounded-[var(--radius-card)] border border-status-success-border bg-status-success-bg/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-status-success-text" />
                  <span className="font-bold text-foreground text-sm">Assignment Graded</span>
                </div>
                <span className="text-lg font-bold text-status-success-text">
                  {Number(mySub.marks)} / {Number(assignment.maxMarks)} Marks
                </span>
              </div>

              {mySub.feedback && (
                <div className="p-3.5 rounded-[var(--radius-control)] bg-surface border border-border text-xs text-foreground space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Teacher&apos;s Feedback:
                  </span>
                  <p className="whitespace-pre-wrap">{mySub.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Submission Section */}
          {assignment.mode === 'OFFLINE' ? (
            <div className="p-5 rounded-[var(--radius-card)] border border-border bg-surface text-xs space-y-2">
              <h3 className="font-bold text-foreground text-sm">Offline Submission</h3>
              <p className="text-muted-foreground">
                This assignment is submitted physically in class. Your teacher will evaluate and record
                your score directly on EduFlow.
              </p>
              {isGraded && (
                <p className="font-semibold text-status-success-text pt-2">
                  Your recorded score: {Number(mySub?.marks)} / {Number(assignment.maxMarks)}
                </p>
              )}
            </div>
          ) : isStudent ? (
            // Student submission form or submitted status
            <div className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span>My Submission</span>
                </h3>

                {isSubmitted && !isResubmitting && (
                  <span className="text-xs text-muted-foreground">
                    Submitted on {mySub?.submittedAt ? formatDate(new Date(mySub.submittedAt), tz) : '—'}
                  </span>
                )}
              </div>

              {/* Already Submitted View (Read mode) */}
              {isSubmitted && !isResubmitting ? (
                <div className="space-y-4">
                  {mySub?.textAnswer && (
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Your Written Answer:
                      </span>
                      <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-xs text-foreground whitespace-pre-wrap">
                        {mySub.textAnswer}
                      </div>
                    </div>
                  )}

                  {mySub?.attachments && mySub.attachments.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Attached Files ({mySub.attachments.length}):
                      </span>
                      <div className="divide-y divide-border border border-border rounded-[var(--radius-control)] overflow-hidden">
                        {mySub.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-3 bg-surface flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <span className="font-medium text-foreground truncate">{att.title}</span>
                              {att.format && (
                                <span className="text-[10px] uppercase font-bold text-muted-foreground px-1 py-0.5 rounded bg-surface-hover border border-border">
                                  {att.format}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadAttachment(att)}
                              disabled={downloadingId === att.id}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resubmit button if not graded and not closed */}
                  {!isGraded && !isSubmissionClosed && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStudentText(mySub?.textAnswer || '');
                          setIsResubmitting(true);
                        }}
                      >
                        Resubmit Assignment
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Submission / Resubmission Form
                <div className="space-y-4">
                  {/* Late Warning Alert */}
                  {isPastDue && assignment.allowLate && (
                    <div className="p-3 rounded-[var(--radius-control)] border border-status-warning-border bg-status-warning-bg/30 text-xs text-status-warning-text flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        The deadline has passed. Late submissions are accepted, but your submission will be
                        marked as <strong>LATE</strong>.
                      </span>
                    </div>
                  )}

                  {/* Closed Alert */}
                  {isSubmissionClosed ? (
                    <div className="p-4 rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg/20 text-xs text-status-danger-text flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>Submissions Closed:</strong> The deadline has passed and late submissions
                        are not allowed for this assignment.
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Text Answer */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Written Response / Notes (Optional if attaching files)
                        </label>
                        <Textarea
                          placeholder="Type your response, calculations, or submission notes here..."
                          rows={4}
                          value={studentText}
                          onChange={(e) => setStudentText(e.target.value)}
                        />
                      </div>

                      {/* File Upload Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-foreground">
                            Upload Solution Files (Up to 5 files, max {submissionLimits?.maxMb || 10}MB each)
                          </label>
                          <span className="text-muted-foreground">{stagedFiles.length}/5 files</span>
                        </div>

                        {stagedFiles.length < 5 && (
                          <div className="border border-dashed border-border rounded-[var(--radius-control)] p-4 text-center hover:bg-surface-hover/30 transition-colors">
                            <input
                              type="file"
                              id="submissionFileInput"
                              multiple
                              className="hidden"
                              onChange={handleFileSelect}
                              accept={submissionLimits?.acceptString || '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp'}
                            />
                            <label
                              htmlFor="submissionFileInput"
                              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                            >
                              <Paperclip className="h-5 w-5 text-primary" />
                              <span className="text-xs font-semibold text-primary">
                                Choose files to upload
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {submissionLimits
                                  ? `Supported: ${submissionLimits.allowedFormats.map((f) => f.toUpperCase()).join(', ')} (${submissionLimits.maxMb}MB limit)`
                                  : 'Supported: PDF, DOC, DOCX, PNG, JPG (10MB limit)'}
                              </span>
                            </label>
                          </div>
                        )}

                        {/* Staged files list with progress */}
                        {stagedFiles.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {stagedFiles.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <FileText className="h-4 w-4 text-primary shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">{item.file.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {(item.file.size / 1024).toFixed(0)} KB
                                    </p>
                                    {item.status === 'uploading' && (
                                      <div className="w-full bg-border rounded-full h-1 mt-1 overflow-hidden">
                                        <div
                                          className="bg-primary h-full transition-all duration-300"
                                          style={{ width: `${item.progress}%` }}
                                        />
                                      </div>
                                    )}
                                    {item.status === 'error' && (
                                      <p className="text-[10px] text-status-danger-text">{item.error}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {item.status === 'error' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => uploadSingleFile(item)}
                                      title="Retry upload"
                                    >
                                      <RotateCw className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeStagedFile(item.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                                    title="Remove file"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                        {isResubmitting && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsResubmitting(false)}
                            disabled={isSubmittingWork}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          onClick={handleSubmitAssignment}
                          disabled={isSubmittingWork || (!studentText.trim() && stagedFiles.length === 0)}
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          {isSubmittingWork
                            ? 'Submitting...'
                            : isResubmitting
                            ? 'Confirm Resubmission'
                            : 'Submit Assignment'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Guardian read-only view of child's submission
            <div className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-3">
              <h3 className="text-sm font-bold text-foreground">Student Submission Status</h3>
              {isSubmitted ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Submitted on {mySub?.submittedAt ? formatDate(new Date(mySub.submittedAt), tz) : '—'}
                  </p>
                  {mySub?.textAnswer && (
                    <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/20 text-xs">
                      <span className="font-semibold block text-muted-foreground mb-1">Answer Text:</span>
                      <p className="whitespace-pre-wrap">{mySub.textAnswer}</p>
                    </div>
                  )}
                  {mySub?.attachments && mySub.attachments.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold block mb-1">Attached Files:</span>
                      <div className="divide-y divide-border border border-border rounded-[var(--radius-control)]">
                        {mySub.attachments.map((att) => (
                          <div key={att.id} className="p-2.5 flex items-center justify-between text-xs">
                            <span className="truncate">{att.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadAttachment(att)}
                              disabled={downloadingId === att.id}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-status-danger-text italic">
                  No submission received yet from student.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Staff: Grading Drawer Modal */}
      {isGradingDrawerOpen && selectedSubmissionToGrade && assignment && (
        <GradingDrawer
          isOpen={isGradingDrawerOpen}
          onClose={() => {
            setIsGradingDrawerOpen(false);
            setSelectedSubmissionToGrade(null);
          }}
          onSuccess={() => {
            loadStaffSubmissions();
            loadAssignment();
          }}
          assignment={{
            id: assignment.id,
            title: assignment.title,
            totalMarks: Number(assignment.maxMarks),
          }}
          submission={selectedSubmissionToGrade}
        />
      )}

      {/* Staff: Delete Assignment Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Assignment"
          description="Are you sure you want to delete this assignment? If submissions already exist, you should unpublish it instead."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. All assignment settings and linked materials will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAssignment}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
