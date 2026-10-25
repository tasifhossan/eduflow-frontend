'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPatch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';

export interface SubmissionToGrade {
  id: string;
  studentId: string;
  student?: {
    id: string;
    name: string;
    studentCode?: string | null;
  };
  status: string;
  textContent?: string | null;
  textAnswer?: string | null;
  marks?: number | string | null;
  marksObtained?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  attachments?: Array<{
    id: string;
    kind: string;
    title: string;
    format?: string;
    bytes?: number;
    url?: string;
  }>;
}

export interface GradingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSub: unknown) => void;
  assignment: {
    id: string;
    title: string;
    totalMarks: number;
  };
  submission: SubmissionToGrade | null;
}

export function GradingDrawer({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  submission,
}: GradingDrawerProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const [prevSubmissionId, setPrevSubmissionId] = React.useState(submission?.id);
  const [marks, setMarks] = React.useState<string>(() => {
    if (!submission) return '';
    return submission.marks !== null && submission.marks !== undefined
      ? String(submission.marks)
      : (submission.marksObtained !== null && submission.marksObtained !== undefined
        ? String(submission.marksObtained)
        : '');
  });
  const [feedback, setFeedback] = React.useState<string>(submission?.feedback || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  if (submission?.id !== prevSubmissionId) {
    setPrevSubmissionId(submission?.id);
    const currentMarks = submission
      ? (submission.marks !== null && submission.marks !== undefined
        ? String(submission.marks)
        : (submission.marksObtained !== null && submission.marksObtained !== undefined
          ? String(submission.marksObtained)
          : ''))
      : '';
    setMarks(currentMarks);
    setFeedback(submission?.feedback || '');
  }

  if (!submission) return null;

  const handleDownload = async (att: { id: string; kind: string; url?: string }) => {
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
        toast.error('Could not generate download link');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMarks = parseFloat(marks);
    if (isNaN(numMarks) || numMarks < 0) {
      toast.error('Please enter valid non-negative marks');
      return;
    }

    if (numMarks > assignment.totalMarks) {
      toast.error(`Marks cannot exceed total maximum marks (${assignment.totalMarks})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPatch<{ success: boolean; data: unknown }>(
        `/api/submissions/${submission.id}/grade`,
        {
          marks: numMarks,
          feedback: feedback.trim() || undefined,
        }
      );

      if (res?.success) {
        toast.success(`Submission graded (${numMarks} / ${assignment.totalMarks}). Student notified!`);
        onSuccess(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to grade submission';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLate = submission.status === 'LATE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Grade Student Submission"
      description={`Review submission and record marks for ${submission.student?.name || 'Student'}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student metadata */}
        <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-foreground text-sm">{submission.student?.name}</p>
            <p className="text-muted-foreground mt-0.5">
              Code: {submission.student?.studentCode || 'N/A'} · Submitted:{' '}
              {submission.submittedAt ? formatDateTime(submission.submittedAt, tz) : 'N/A'}
            </p>
          </div>
          {isLate && (
            <span className="px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-status-warning-bg text-status-warning-text border border-status-warning-border font-bold text-xs">
              Late Submission
            </span>
          )}
        </div>

        {/* Submitted Text Content */}
        {(submission.textAnswer || submission.textContent) ? (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Submitted Response Text
            </h4>
            <div className="p-3.5 rounded-[var(--radius-control)] border border-border bg-surface text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
              {submission.textAnswer || submission.textContent}
            </div>
          </div>
        ) : null}

        {/* Submitted Files */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Submitted Files ({submission.attachments?.length || 0})
          </h4>
          {!submission.attachments || submission.attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-3 rounded-[var(--radius-control)] border border-dashed border-border text-center">
              No file attachments were included with this submission.
            </p>
          ) : (
            <div className="divide-y divide-border border border-border rounded-[var(--radius-control)] overflow-hidden">
              {submission.attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 bg-surface hover:bg-surface-hover/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{att.title}</span>
                    {att.format && (
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">
                        .{att.format}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(att)}
                    disabled={downloadingId === att.id}
                    className="h-7 text-xs gap-1"
                  >
                    <Download className="h-3 w-3" />
                    <span>{downloadingId === att.id ? 'Loading...' : 'Download'}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grading Form Inputs */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Marks Awarded (Out of {assignment.totalMarks}) *
              </label>
              <Input
                type="number"
                step="any"
                min={0}
                max={assignment.totalMarks}
                placeholder={`0 - ${assignment.totalMarks}`}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col justify-end text-xs text-muted-foreground pb-2">
              <span>Maximum Marks: <strong className="text-foreground">{assignment.totalMarks}</strong></span>
              <span>Grading will notify the student and update their academic scores.</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Teacher Feedback & Comments</label>
            <Textarea
              placeholder="Great work on problem 2. Review the formula derivation in step 4..."
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || marks === ''}>
            {isSubmitting ? 'Submitting Grade...' : 'Save & Notify Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
