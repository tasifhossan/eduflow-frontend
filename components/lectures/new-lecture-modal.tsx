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
import { AlertTriangle, Clock } from 'lucide-react';

const newLectureSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  subjectId: z.string().min(1, 'Please select a subject'),
  chapterId: z.string().optional(),
  teacherId: z.string().optional(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  plannedTopics: z.string().optional(),
  startsAt: z.string().min(1, 'Start date and time is required'),
  endsAt: z.string().min(1, 'End date and time is required'),
  isPublished: z.boolean(),
  onlineProvider: z.enum(['NONE', 'GOOGLE_MEET', 'ZOOM', 'OTHER']),
  onlineMeetingUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  onlineMeetingId: z.string().optional(),
  onlineMeetingPasscode: z.string().optional(),
});

type NewLectureFormData = z.infer<typeof newLectureSchema>;

interface OverlapWarning {
  teacherClashes?: Array<{ id: string; title: string; startsAt: string; endsAt: string }>;
  batchClashes?: Array<{ id: string; title: string; startsAt: string; endsAt: string }>;
}

export interface NewLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLecture: unknown) => void;
  batches: Array<{ id: string; name: string; subjectId?: string; teacherId?: string }>;
  subjects: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; name: string }>;
  currentUserId?: string;
  currentUserRole?: string;
}

export function NewLectureModal({
  isOpen,
  onClose,
  onSuccess,
  batches,
  subjects,
  teachers,
  currentUserId,
  currentUserRole,
}: NewLectureModalProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';
  const [warnings, setWarnings] = React.useState<OverlapWarning | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [chapters, setChapters] = React.useState<Array<{ id: string; title: string }>>([]);

  const [defaultDates] = React.useState(() => {
    const now = Date.now();
    return {
      defaultStart: new Date(now + 60 * 60 * 1000),
      defaultEnd: new Date(now + 2 * 60 * 60 * 1000),
    };
  });
  const { defaultStart, defaultEnd } = defaultDates;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useZodForm<NewLectureFormData>(newLectureSchema, {
    defaultValues: {
      batchId: '',
      subjectId: '',
      chapterId: '',
      teacherId: currentUserRole === 'TEACHER' ? currentUserId : '',
      title: '',
      plannedTopics: '',
      startsAt: utcToCenterDateTimeInput(defaultStart, tz),
      endsAt: utcToCenterDateTimeInput(defaultEnd, tz),
      isPublished: true,
      onlineProvider: 'NONE',
      onlineMeetingUrl: '',
      onlineMeetingId: '',
      onlineMeetingPasscode: '',
    },
  });

  const selectedBatchId = watch('batchId');
  const selectedSubjectId = watch('subjectId');
  const onlineProvider = watch('onlineProvider');
  const isPublished = watch('isPublished');

  // Auto-fill subject & teacher when batch is selected
  React.useEffect(() => {
    if (selectedBatchId) {
      const b = batches.find((item) => item.id === selectedBatchId);
      if (b?.subjectId) {
        setValue('subjectId', b.subjectId);
      }
      if (b?.teacherId && currentUserRole !== 'TEACHER') {
        setValue('teacherId', b.teacherId);
      }
    }
  }, [selectedBatchId, batches, setValue, currentUserRole]);

  // Load chapters for selected subject
  React.useEffect(() => {
    let active = true;
    if (!selectedSubjectId) {
      const timer = setTimeout(() => {
        if (active) setChapters([]);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    fetch(`/api/subjects/${selectedSubjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.success && data?.data?.chapters) {
          setChapters(data.data.chapters);
        } else {
          setChapters([]);
        }
      })
      .catch(() => {
        if (active) setChapters([]);
      });

    return () => {
      active = false;
    };
  }, [selectedSubjectId]);

  const onSubmit = async (data: NewLectureFormData) => {
    setIsSubmitting(true);
    setWarnings(null);
    try {
      const payload = {
        batchId: data.batchId,
        subjectId: data.subjectId,
        chapterId: data.chapterId || undefined,
        teacherId: data.teacherId || (currentUserRole === 'TEACHER' ? currentUserId : undefined),
        title: data.title,
        plannedTopics: data.plannedTopics || undefined,
        startsAt: centerDateTimeInputToUtc(data.startsAt, tz),
        endsAt: centerDateTimeInputToUtc(data.endsAt, tz),
        isPublished: data.isPublished,
        onlineProvider: data.onlineProvider,
        onlineMeetingUrl: data.onlineMeetingUrl || undefined,
        onlineMeetingId: data.onlineMeetingId || undefined,
        onlineMeetingPasscode: data.onlineMeetingPasscode || undefined,
      };

      const res = await apiPost<{ success: boolean; data: unknown; warnings?: OverlapWarning }>(
        '/api/lectures',
        payload
      );

      if (res?.success) {
        if (
          res.warnings &&
          ((res.warnings.teacherClashes?.length || 0) > 0 ||
            (res.warnings.batchClashes?.length || 0) > 0)
        ) {
          setWarnings(res.warnings);
          toast.warning('Lecture created with schedule overlap warnings');
        } else {
          toast.success('Lecture created successfully');
        }
        onSuccess(res.data);
        reset();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lecture';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Lecture"
      description="Plan an upcoming lecture, set routine timing, and configure online live class details"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Warnings Banner */}
        {warnings && (
          <div
            role="alert"
            className="p-3.5 rounded-[var(--radius-control)] border border-warning/30 bg-warning-subtle text-foreground text-xs space-y-1.5"
          >
            <div className="flex items-center gap-2 font-bold text-status-warning-text">
              <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" />
              <span>Schedule Overlap Notice (Non-blocking)</span>
            </div>
            {warnings.teacherClashes && warnings.teacherClashes.length > 0 && (
              <p className="text-muted-foreground">
                Teacher has another lecture scheduled during this time window.
              </p>
            )}
            {warnings.batchClashes && warnings.batchClashes.length > 0 && (
              <p className="text-muted-foreground">
                Batch already has a lecture scheduled during this time window.
              </p>
            )}
          </div>
        )}

        {/* Batch & Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Batch *</label>
            <Select isError={!!errors.batchId} {...register('batchId')}>
              <option value="">Select a batch</option>
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
              <option value="">Select a subject</option>
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

        {/* Chapter & Teacher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Chapter (Optional)</label>
            <Select isError={!!errors.chapterId} disabled={chapters.length === 0} {...register('chapterId')}>
              <option value="">{chapters.length === 0 ? 'No chapters found' : 'Select chapter'}</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            {errors.chapterId && (
              <p className="text-xs text-status-danger-text mt-1">{errors.chapterId.message}</p>
            )}
          </div>

          {currentUserRole !== 'TEACHER' ? (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Assigned Teacher</label>
              <Select isError={!!errors.teacherId} {...register('teacherId')}>
                <option value="">Select a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {errors.teacherId && (
                <p className="text-xs text-status-danger-text mt-1">{errors.teacherId.message}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5">
                Teacher
              </label>
              <div className="h-10 px-3 rounded-[var(--radius-control)] border border-border bg-muted/40 text-xs text-foreground flex items-center">
                Self (Logged-in Teacher)
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Lecture Title *</label>
          <Input
            placeholder="e.g. Higher Math - Trigonometric Functions Lecture 1"
            isError={!!errors.title}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-status-danger-text mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Date & Time Picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Schedule Time Range</span>
            <span className="flex items-center gap-1 text-primary">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Center Time: {getTimezoneDisplay(tz)}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Starts At *</label>
              <Input
                type="datetime-local"
                isError={!!errors.startsAt}
                {...register('startsAt')}
              />
              {errors.startsAt && (
                <p className="text-xs text-status-danger-text mt-1">{errors.startsAt.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Ends At *</label>
              <Input
                type="datetime-local"
                isError={!!errors.endsAt}
                {...register('endsAt')}
              />
              {errors.endsAt && (
                <p className="text-xs text-status-danger-text mt-1">{errors.endsAt.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Topics Textarea */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Planned Topics / Syllabus Agenda</label>
          <Textarea
            placeholder="Key concepts, derivation of formulas, practice problems to solve..."
            rows={3}
            isError={!!errors.plannedTopics}
            {...register('plannedTopics')}
          />
          {errors.plannedTopics && (
            <p className="text-xs text-status-danger-text mt-1">{errors.plannedTopics.message}</p>
          )}
        </div>

        {/* Online Class Section */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface-hover/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Online Class Integration</h4>
              <p className="text-[11px] text-muted-foreground">
                Join button opens automatically for students 30 mins before start.
              </p>
            </div>
            <div className="w-40">
              <Select {...register('onlineProvider')}>
                <option value="NONE">None (In-person)</option>
                <option value="GOOGLE_MEET">Google Meet</option>
                <option value="ZOOM">Zoom</option>
                <option value="OTHER">Other Live Link</option>
              </Select>
            </div>
          </div>

          {onlineProvider !== 'NONE' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Meeting URL *</label>
                <Input
                  placeholder="https://meet.google.com/..."
                  isError={!!errors.onlineMeetingUrl}
                  {...register('onlineMeetingUrl')}
                />
                {errors.onlineMeetingUrl && (
                  <p className="text-xs text-status-danger-text mt-1">{errors.onlineMeetingUrl.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Passcode (Optional)</label>
                <Input
                  placeholder="123456"
                  isError={!!errors.onlineMeetingPasscode}
                  {...register('onlineMeetingPasscode')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Publish Checkbox */}
        <div className="pt-1">
          <Checkbox
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setValue('isPublished', e.target.checked)}
            label="Publish immediately (visible to enrolled students & guardians)"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Lecture'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
