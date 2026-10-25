'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPatch } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import {
  centerDateTimeInputToUtc,
  utcToCenterDateTimeInput,
  getTimezoneDisplay,
} from '@/lib/tz';
import { toast } from 'sonner';
import { Clock, AlertTriangle } from 'lucide-react';

export interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  lecture: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
  };
}

export function RescheduleModal({
  isOpen,
  onClose,
  onSuccess,
  lecture,
}: RescheduleModalProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const [prevId, setPrevId] = React.useState(lecture.id);
  const [startsAt, setStartsAt] = React.useState(
    utcToCenterDateTimeInput(lecture.startsAt, tz)
  );
  const [endsAt, setEndsAt] = React.useState(
    utcToCenterDateTimeInput(lecture.endsAt, tz)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (lecture.id !== prevId) {
    setPrevId(lecture.id);
    setStartsAt(utcToCenterDateTimeInput(lecture.startsAt, tz));
    setEndsAt(utcToCenterDateTimeInput(lecture.endsAt, tz));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startsAt || !endsAt) {
      toast.error('Both start and end dates/times are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPatch<{ success: boolean; data: unknown }>(
        `/api/lectures/${lecture.id}`,
        {
          startsAt: centerDateTimeInputToUtc(startsAt, tz),
          endsAt: centerDateTimeInputToUtc(endsAt, tz),
        }
      );
      if (res?.success) {
        toast.success('Lecture rescheduled successfully. Students and guardians have been notified.');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule lecture';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Lecture"
      description={`Update date and timing for "${lecture.title}"`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Notice alert */}
        <div
          role="alert"
          className="p-3.5 rounded-[var(--radius-control)] border border-warning/30 bg-warning-subtle text-foreground text-xs space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold text-status-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" />
            <span>Important Notification Notice</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Rescheduling will update the class routine and automatically send notification alerts to all enrolled students and linked guardians.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="font-semibold">Center Timezone</span>
          <span className="flex items-center gap-1 text-primary">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{getTimezoneDisplay(tz)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">New Start Time *</label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">New End Time *</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
