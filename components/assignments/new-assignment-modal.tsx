'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/components/ui/form-helpers';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiPost } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import {
  centerDateTimeInputToUtc,
  utcToCenterDateTimeInput,
  getTimezoneDisplay,
} from '@/lib/tz';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

const newAssignmentSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  subjectId: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  instructions: z.string().trim().min(1, 'Instructions are required').max(10000),
  mode: z.enum(['ONLINE', 'OFFLINE']),
  maxMarks: z.coerce.number().positive('Max marks must be positive').max(1000),
  dueAt: z.string().min(1, 'Due date and time is required'),
  allowLate: z.boolean(),
  publishNow: z.boolean(),
});

type NewAssignmentFormData = z.infer<typeof newAssignmentSchema>;

export interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAssignment: unknown) => void;
  batches: Array<{ id: string; name: string; subjectId?: string }>;
  subjects: Array<{ id: string; name: string }>;
  initialValues?: {
    batchId?: string;
    subjectId?: string;
    title?: string;
    instructions?: string;
  };
}

export function NewAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  batches,
  subjects,
  initialValues,
}: NewAssignmentModalProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Default due date: 3 days from now at 23:59
  const [defaultDue] = React.useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    d.setHours(23, 59, 0, 0);
    return d;
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useZodForm<NewAssignmentFormData>(newAssignmentSchema, {
    defaultValues: {
      batchId: initialValues?.batchId || '',
      subjectId: initialValues?.subjectId || '',
      title: initialValues?.title || '',
      instructions: initialValues?.instructions || '',
      mode: 'ONLINE',
      maxMarks: 20,
      dueAt: utcToCenterDateTimeInput(defaultDue, tz),
      allowLate: true,
      publishNow: true,
    },
  });

  const selectedBatchId = watch('batchId');
  const allowLate = watch('allowLate');
  const publishNow = watch('publishNow');

  // Sync batch subject
  React.useEffect(() => {
    if (selectedBatchId) {
      const b = batches.find((item) => item.id === selectedBatchId);
      if (b?.subjectId) {
        setValue('subjectId', b.subjectId);
      }
    }
  }, [selectedBatchId, batches, setValue]);

  const onSubmit = async (data: NewAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        batchId: data.batchId,
        subjectId: data.subjectId || undefined,
        title: data.title,
        instructions: data.instructions,
        mode: data.mode,
        maxMarks: data.maxMarks,
        dueAt: centerDateTimeInputToUtc(data.dueAt, tz),
        allowLate: data.allowLate,
        publishNow: data.publishNow,
      };

      const res = await apiPost<{ success: boolean; data: unknown }>('/api/assignments', payload);
      if (res?.success) {
        toast.success(
          data.publishNow
            ? 'Assignment created and published to students'
            : 'Assignment saved as draft'
        );
        onSuccess(res.data);
        reset();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assignment';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Assignment"
      description="Create homework, essay assignments, or offline written assignments with grading rules"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Batch & Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Target Batch *</label>
            <Select isError={!!errors.batchId} {...register('batchId')}>
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            {errors.batchId && (
              <p className="text-xs text-status-danger-text mt-1">{errors.batchId.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Subject *</label>
            <Select isError={!!errors.subjectId} {...register('subjectId')}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {errors.subjectId && (
              <p className="text-xs text-status-danger-text mt-1">{errors.subjectId.message}</p>
            )}
          </div>
        </div>

        {/* Submission Mode */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Submission Mode *</label>
          <Select isError={!!errors.mode} {...register('mode')}>
            <option value="ONLINE">Online Submission (Files and Text)</option>
            <option value="OFFLINE">Offline / Physical (In-Class Marks)</option>
          </Select>
          {errors.mode && (
            <p className="text-xs text-status-danger-text mt-1">{errors.mode.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Assignment Title *</label>
          <Input
            placeholder="e.g. Physics Chapter 3 Problem Set 1"
            isError={!!errors.title}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-status-danger-text mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Description / Instructions */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Instructions & Guidelines *</label>
          <Textarea
            placeholder="Detail questions to solve, submission requirements, format rules..."
            rows={3}
            isError={!!errors.instructions}
            {...register('instructions')}
          />
          {errors.instructions && (
            <p className="text-xs text-status-danger-text mt-1">{errors.instructions.message}</p>
          )}
        </div>

        {/* Marks & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Total Maximum Marks *</label>
            <Input
              type="number"
              min={1}
              max={1000}
              isError={!!errors.maxMarks}
              {...register('maxMarks')}
            />
            {errors.maxMarks && (
              <p className="text-xs text-status-danger-text mt-1">{errors.maxMarks.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Submission Deadline *</span>
              <span className="flex items-center gap-1 text-primary text-[11px]">
                <Clock className="h-3 w-3" />
                <span>{getTimezoneDisplay(tz)}</span>
              </span>
            </div>
            <Input
              type="datetime-local"
              isError={!!errors.dueAt}
              {...register('dueAt')}
            />
            {errors.dueAt && (
              <p className="text-xs text-status-danger-text mt-1">{errors.dueAt.message}</p>
            )}
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 space-y-3">
          <Checkbox
            id="allowLate"
            checked={allowLate}
            onChange={(e) => setValue('allowLate', e.target.checked)}
            label="Allow late submissions (marked with late badge; rejected if unchecked)"
          />

          <Checkbox
            id="publishNowAssign"
            checked={publishNow}
            onChange={(e) => setValue('publishNow', e.target.checked)}
            label="Publish immediately (notify enrolled students and linked guardians)"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : publishNow ? 'Publish Assignment' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
