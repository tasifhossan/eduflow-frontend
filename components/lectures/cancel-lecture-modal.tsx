'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiPatch } from '@/lib/api';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

export interface CancelLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  lecture: {
    id: string;
    title: string;
  };
}

export function CancelLectureModal({
  isOpen,
  onClose,
  onSuccess,
  lecture,
}: CancelLectureModalProps) {
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiPatch<{ success: boolean; data: unknown }>(
        `/api/lectures/${lecture.id}`,
        {
          status: 'CANCELLED',
          plannedTopics: reason.trim() ? `[Cancelled: ${reason.trim()}]` : undefined,
        }
      );
      if (res?.success) {
        toast.success('Lecture marked as cancelled');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel lecture';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Lecture"
      description={`Are you sure you want to cancel "${lecture.title}"?`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          role="alert"
          className="p-3.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger-subtle text-foreground text-xs space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold text-status-danger-text">
            <AlertCircle className="h-4 w-4 shrink-0 text-status-danger" />
            <span>Class Cancellation</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            The lecture will be marked as Cancelled on the student timetable and calendar.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Reason for Cancellation (Optional)</label>
          <Textarea
            placeholder="e.g. Inclement weather, teacher emergency leave..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Keep Lecture
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
