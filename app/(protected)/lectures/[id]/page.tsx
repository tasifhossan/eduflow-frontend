'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Video,
  Clock,
  BookOpen,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { formatCenterTime, formatDate } from '@/lib/tz';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, StatusVariant } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { RescheduleModal } from '@/components/lectures/reschedule-modal';
import { CompleteLectureModal } from '@/components/lectures/complete-lecture-modal';
import { CancelLectureModal } from '@/components/lectures/cancel-lecture-modal';
import { OnlineClassModal } from '@/components/lectures/online-class-modal';
import { UploadMaterialModal } from '@/components/lectures/upload-material-modal';
import { toast } from 'sonner';

interface AttachmentItem {
  id: string;
  kind: 'FILE' | 'LINK';
  title: string;
  url?: string | null;
  publicId?: string | null;
  format?: string | null;
  bytes?: number | null;
  originalName?: string | null;
  createdAt: string;
}

interface LectureDetail {
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
  materials?: AttachmentItem[];
  attachments?: AttachmentItem[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LectureDetailPage({ params }: PageProps) {
  const { id: lectureId } = use(params);
  const { user } = useAuth();
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';
  const isGuardian = user?.role === 'GUARDIAN';

  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Publish with notification modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Delete attachment confirmation
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);
  const [isDeletingAtt, setIsDeletingAtt] = useState(false);

  // Downloading attachment tracking
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const fetchLecture = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await apiGet<{ success: boolean; data: LectureDetail }>(
          `/api/lectures/${lectureId}`
        );
        if (!active) return;
        if (res?.success && res.data) {
          setLecture(res.data);
          setError(null);
        } else {
          setError('Lecture not found or you do not have permission to view it');
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load lecture details';
        setError(msg);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [lectureId, reloadKey]);

  const handleTogglePublish = async () => {
    if (!lecture) return;
    if (!lecture.isPublished) {
      // Show confirmation dialog with notify checkbox
      setIsPublishModalOpen(true);
    } else {
      // Unpublish immediately
      try {
        const res = await apiPatch<{ success: boolean; data: unknown }>(
          `/api/lectures/${lecture.id}`,
          { isPublished: false }
        );
        if (res?.success) {
          toast.success('Lecture unpublished (hidden from students)');
          setLecture((prev) => (prev ? { ...prev, isPublished: false } : null));
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to unpublish');
      }
    }
  };

  const handleConfirmPublish = async () => {
    if (!lecture) return;
    setIsPublishing(true);
    try {
      const res = await apiPatch<{ success: boolean; data: unknown }>(
        `/api/lectures/${lecture.id}`,
        {
          isPublished: true,
          notifyStudents: notifyOnPublish,
        }
      );
      if (res?.success) {
        toast.success(
          notifyOnPublish
            ? 'Lecture published and students notified'
            : 'Lecture published'
        );
        setLecture((prev) => (prev ? { ...prev, isPublished: true } : null));
        setIsPublishModalOpen(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadAttachment = async (att: AttachmentItem) => {
    if (att.kind === 'LINK') {
      if (att.url) {
        window.open(att.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setDownloadingAttId(att.id);
    try {
      const res = await apiGet<{ success: boolean; data: { url: string; expiresAt: string } }>(
        `/api/attachments/${att.id}/download`
      );
      if (res?.success && res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Download link could not be generated. Please retry.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download denied or access expired';
      toast.error(msg);
    } finally {
      setDownloadingAttId(null);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deletingAttId) return;
    setIsDeletingAtt(true);
    try {
      const res = await apiDelete(`/api/attachments/${deletingAttId}`);
      if (res?.success) {
        toast.success('Attachment deleted successfully');
        setLecture((prev) => {
          if (!prev) return null;
          const filterList = (list?: AttachmentItem[]) =>
            list ? list.filter((a) => a.id !== deletingAttId) : [];
          return {
            ...prev,
            materials: filterList(prev.materials),
            attachments: filterList(prev.attachments),
          };
        });
        setDeletingAttId(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete attachment');
    } finally {
      setIsDeletingAtt(false);
    }
  };

  const handleCopyPasscode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPasscode(true);
    toast.success('Meeting passcode copied to clipboard');
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const getStatusVariant = (status: string): StatusVariant => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'CANCELLED') return 'cancelled';
    return 'planned';
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        <ErrorState
          title="Could not load lecture"
          message={error || 'Lecture details are unavailable'}
          onRetry={fetchLecture}
        />
        <div className="flex justify-center">
          <Link
            href="/lectures"
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Back to lectures list
          </Link>
        </div>
      </div>
    );
  }

  const materials = lecture.materials || lecture.attachments || [];
  const hasOnline = lecture.onlineProvider && lecture.onlineProvider !== 'NONE';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={lecture.title}
        description={`${lecture.batch?.name || 'Batch'} · ${lecture.subject?.name || 'Subject'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Lectures', href: '/lectures' },
          { label: lecture.title },
        ]}
        actions={
          isStaff ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={lecture.isPublished ? 'outline' : 'primary'}
                size="sm"
                onClick={handleTogglePublish}
                className="gap-1.5"
              >
                {lecture.isPublished ? (
                  <>
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                    <span>Unpublish</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Publish</span>
                  </>
                )}
              </Button>

              {lecture.status !== 'COMPLETED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCompleteOpen(true)}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Mark Completed</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduleOpen(true)}
                className="gap-1.5"
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Reschedule</span>
              </Button>

              {lecture.status !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelOpen(true)}
                  className="text-danger hover:bg-danger/10 hover:border-danger/40"
                >
                  Cancel
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Main Info Card */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card space-y-6">
        {/* Meta badges row */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge variant={getStatusVariant(lecture.status)}>
              {lecture.status.toLowerCase()}
            </StatusBadge>

            {!lecture.isPublished && (
              <StatusBadge variant="draft">
                Draft (Hidden from students)
              </StatusBadge>
            )}

            {hasOnline && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-secondary-subtle text-secondary border border-border">
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lecture.onlineProvider?.replace('_', ' ')}</span>
              </span>
            )}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>
              {formatDate(lecture.startsAt, tz)} · {formatCenterTime(lecture.startsAt, tz)} - {formatCenterTime(lecture.endsAt, tz)}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block font-medium">Batch</span>
            <span className="text-foreground font-bold text-sm">{lecture.batch?.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block font-medium">Subject</span>
            <span className="text-foreground font-bold text-sm">{lecture.subject?.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block font-medium">Teacher</span>
            <span className="text-foreground font-bold text-sm">
              {lecture.teacher?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Chapter info */}
        {lecture.chapter && (
          <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 text-xs flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold text-foreground">Syllabus Chapter:</span>{' '}
              {lecture.chapter.title}
            </span>
          </div>
        )}

        {/* Topics & Notes */}
        <div className="space-y-4 pt-2">
          {lecture.plannedTopics && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Planned Topics
              </h3>
              <p className="text-xs text-foreground bg-surface-hover/30 p-3.5 rounded-[var(--radius-control)] border border-border leading-relaxed whitespace-pre-wrap">
                {lecture.plannedTopics}
              </p>
            </div>
          )}

          {lecture.coveredTopics && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                Covered in Class
              </h3>
              <p className="text-xs text-foreground bg-secondary-subtle/40 p-3.5 rounded-[var(--radius-control)] border border-secondary/30 leading-relaxed whitespace-pre-wrap">
                {lecture.coveredTopics}
              </p>
            </div>
          )}

          {lecture.homeworkNote && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Homework & Assignment Notes
              </h3>
              <p className="text-xs text-foreground bg-primary-subtle/30 p-3.5 rounded-[var(--radius-control)] border border-primary/20 leading-relaxed whitespace-pre-wrap">
                {lecture.homeworkNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Online Class Live Session Box */}
      {hasOnline && (
        <div className="rounded-[var(--radius-card)] border border-secondary/30 bg-secondary-subtle/20 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <Video className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Online Live Class ({lecture.onlineProvider?.replace('_', ' ')})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lecture.canJoinNow
                    ? 'Class session is now open for joining.'
                    : `Class join window opens at ${
                        lecture.joinOpensAt ? formatCenterTime(lecture.joinOpensAt, tz) : 'scheduled time'
                      }`}
                </p>
              </div>
            </div>

            {/* Staff action: Reconfigure link */}
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOnlineModalOpen(true)}
                className="gap-1 text-xs"
              >
                <Edit className="h-3 w-3" />
                <span>Configure Link</span>
              </Button>
            )}
          </div>

          {/* Student Join Controls */}
          {isStudent && (
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {lecture.canJoinNow && lecture.onlineMeetingUrl ? (
                <a
                  href={lecture.onlineMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-control)] bg-secondary text-secondary-foreground hover:bg-secondary-hover font-semibold text-xs transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Video className="h-4 w-4" aria-hidden="true" />
                  <span>Join Live Class</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface text-xs text-muted-foreground">
                  Live session link will appear here 30 minutes before class starts.
                </div>
              )}

              {lecture.canJoinNow && lecture.onlineMeetingPasscode && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Passcode:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPasscode(lecture.onlineMeetingPasscode!)}
                    aria-label="Copy meeting passcode"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] border border-border bg-surface hover:bg-surface-hover text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copiedPasscode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-secondary" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lecture.onlineMeetingPasscode}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guardian View: No join controls displayed */}
          {isGuardian && (
            <p className="text-xs text-muted-foreground italic pt-1">
              Live link is reserved for your child&apos;s student account.
            </p>
          )}

          {/* Staff Info Display */}
          {isStaff && lecture.onlineMeetingUrl && (
            <div className="text-xs text-muted-foreground space-y-1 pt-1 font-mono break-all">
              <p>Meeting URL: <a href={lecture.onlineMeetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{lecture.onlineMeetingUrl}</a></p>
              {lecture.onlineMeetingPasscode && <p>Passcode: {lecture.onlineMeetingPasscode}</p>}
            </div>
          )}
        </div>
      )}

      {/* Materials & Learning Attachments Section */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Lecture Materials & Resources
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Documents, slides, practice problems, and study links for this lecture
            </p>
          </div>

          {isStaff && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Add Material</span>
            </Button>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-[var(--radius-control)]">
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-xs font-medium">No materials attached yet</p>
            <p className="text-[11px] mt-0.5">
              {isStaff
                ? 'Click "Add Material" to upload class slides or external reference links.'
                : 'Your teacher has not uploaded any files for this class.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-[var(--radius-control)] overflow-hidden">
            {materials.map((att) => {
              const isFile = att.kind === 'FILE';
              const isDownloading = downloadingAttId === att.id;

              return (
                <div
                  key={att.id}
                  className="p-3.5 bg-surface hover:bg-surface-hover/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0">
                      {isFile ? (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {att.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="uppercase font-mono">{att.kind}</span>
                        {att.format && <span>· {att.format.toUpperCase()}</span>}
                        {att.bytes && (
                          <span>· {(att.bytes / (1024 * 1024)).toFixed(2)} MB</span>
                        )}
                        <span>· {formatDate(att.createdAt, tz)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadAttachment(att)}
                      disabled={isDownloading}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isFile ? (
                        <>
                          <Download className="h-3 w-3" aria-hidden="true" />
                          <span>{isDownloading ? 'Opening...' : 'Download'}</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          <span>Open Link</span>
                        </>
                      )}
                    </Button>

                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => setDeletingAttId(att.id)}
                        aria-label={`Delete ${att.title}`}
                        className="p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Modals */}
      {isStaff && (
        <>
          <RescheduleModal
            isOpen={isRescheduleOpen}
            onClose={() => setIsRescheduleOpen(false)}
            onSuccess={() => fetchLecture()}
            lecture={lecture}
          />

          <CompleteLectureModal
            isOpen={isCompleteOpen}
            onClose={() => setIsCompleteOpen(false)}
            onSuccess={() => fetchLecture()}
            lecture={lecture}
          />

          <CancelLectureModal
            isOpen={isCancelOpen}
            onClose={() => setIsCancelOpen(false)}
            onSuccess={() => fetchLecture()}
            lecture={lecture}
          />

          <OnlineClassModal
            isOpen={isOnlineModalOpen}
            onClose={() => setIsOnlineModalOpen(false)}
            onSuccess={() => fetchLecture()}
            lecture={lecture}
          />

          <UploadMaterialModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={() => fetchLecture()}
            lectureId={lecture.id}
          />

          {/* Publish Confirmation Modal with Notify Checkbox */}
          <Modal
            isOpen={isPublishModalOpen}
            onClose={() => setIsPublishModalOpen(false)}
            title="Publish Lecture"
            description={`Make "${lecture.title}" visible to all enrolled students and linked guardians.`}
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30">
                <Checkbox
                  id="notifyStudents"
                  checked={notifyOnPublish}
                  onChange={(e) => setNotifyOnPublish(e.target.checked)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="notifyStudents"
                  className="text-xs font-medium text-foreground cursor-pointer leading-relaxed"
                >
                  Send notification alerts to active enrolled students and linked guardians
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsPublishModalOpen(false)}
                  disabled={isPublishing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmPublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Lecture'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Attachment Confirmation Modal */}
          <Modal
            isOpen={Boolean(deletingAttId)}
            onClose={() => setDeletingAttId(null)}
            title="Delete Material Attachment"
            description="Are you sure you want to delete this resource? Students will no longer be able to access it."
            maxWidth="sm"
          >
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingAttId(null)}
                disabled={isDeletingAtt}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteAttachment}
                disabled={isDeletingAtt}
              >
                {isDeletingAtt ? 'Deleting...' : 'Delete Material'}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
