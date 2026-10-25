'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/components/ui/form-helpers';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiPost } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { utcToCenterDateInput, getTimezoneDisplay } from '@/lib/tz';
import { toast } from 'sonner';
import { Calendar, ArrowRight } from 'lucide-react';

const generateSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  from: z.string().min(1, 'Start date is required'),
  to: z.string().min(1, 'End date is required'),
});

type GenerateFormData = z.infer<typeof generateSchema>;

interface PreviewResult {
  createdCount: number;
  skippedCount: number;
  createdLectures?: Array<{
    title: string;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface GenerateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batches: Array<{ id: string; name: string }>;
}

export function GenerateRoutineModal({
  isOpen,
  onClose,
  onSuccess,
  batches,
}: GenerateRoutineModalProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [preview, setPreview] = React.useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useZodForm<GenerateFormData>(generateSchema, {
    defaultValues: {
      batchId: '',
      from: utcToCenterDateInput(today, tz),
      to: utcToCenterDateInput(nextWeek, tz),
    },
  });

  const selectedBatchId = watch('batchId');

  const handlePreview = async (data: GenerateFormData) => {
    setIsPreviewing(true);
    try {
      const res = await apiPost<{ success: boolean; data: PreviewResult }>(
        `/api/batches/${data.batchId}/lectures/generate`,
        {
          from: data.from,
          to: data.to,
          dryRun: true,
        }
      );
      if (res?.success && res.data) {
        setPreview(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to preview routine generation';
      toast.error(msg);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmGenerate = async () => {
    const data = watch();
    if (!data.batchId || !data.from || !data.to) return;

    setIsGenerating(true);
    try {
      const res = await apiPost<{ success: boolean; data: { createdCount: number; skippedCount: number } }>(
        `/api/batches/${data.batchId}/lectures/generate`,
        {
          from: data.from,
          to: data.to,
          dryRun: false,
        }
      );
      if (res?.success) {
        toast.success(
          `Successfully generated ${res.data.createdCount} lectures (${res.data.skippedCount} skipped)`
        );
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate lectures';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Lectures from Routine"
      description="Automatically populate planned lecture slots across a date range according to the batch weekly timetable"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Select Batch *</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">From Date *</label>
              <Input
                type="date"
                isError={!!errors.from}
                {...register('from')}
              />
              {errors.from && (
                <p className="text-xs text-status-danger-text mt-1">{errors.from.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">To Date *</label>
              <Input
                type="date"
                isError={!!errors.to}
                {...register('to')}
              />
              {errors.to && (
                <p className="text-xs text-status-danger-text mt-1">{errors.to.message}</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Slots are evaluated in center timezone: <span className="font-semibold text-foreground">{getTimezoneDisplay(tz)}</span>
          </p>
        </div>

        {/* Preview Summary */}
        {preview ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface-hover/40 p-4 space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Routine Generation Preview
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-[var(--radius-control)] border border-secondary/30 bg-secondary-subtle">
                <span className="text-muted-foreground block">To be created</span>
                <span className="text-xl font-bold font-heading text-secondary">
                  {preview.createdCount}
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface">
                <span className="text-muted-foreground block">Skipped (Already exists)</span>
                <span className="text-xl font-bold font-heading text-muted-foreground">
                  {preview.skippedCount}
                </span>
              </div>
            </div>

            {preview.createdCount === 0 && (
              <p className="text-xs text-muted-foreground">
                All routine slots in this date range have already been generated. No duplicate lectures will be created.
              </p>
            )}
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPreviewing || !selectedBatchId}
              onClick={handleSubmit(handlePreview)}
              className="gap-1.5"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{isPreviewing ? 'Analyzing routine...' : 'Preview Schedule'}</span>
            </Button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>

          {preview && (
            <Button
              type="button"
              variant="primary"
              disabled={isGenerating || preview.createdCount === 0}
              onClick={handleConfirmGenerate}
              className="gap-1.5"
            >
              <span>{isGenerating ? 'Generating...' : `Confirm & Create (${preview.createdCount})`}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
