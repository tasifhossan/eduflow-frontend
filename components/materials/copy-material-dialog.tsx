'use client';

import * as React from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

interface BatchOption {
  id: string;
  name: string;
  teacherId?: string | null;
  subject?: { id: string; name: string };
  isArchived?: boolean;
}

export interface CopyMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
  currentBatchId: string;
  onCopied: () => void;
}

export function CopyMaterialDialog({
  isOpen,
  onClose,
  materialId,
  materialTitle,
  currentBatchId,
  onCopied,
}: CopyMaterialDialogProps) {
  const { user } = useAuth();
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setSelectedBatchIds([]);
    setError(null);
    onClose();
  };

  React.useEffect(() => {
    if (!isOpen) return;

    let active = true;

    apiGet<{ success: boolean; data: { items?: BatchOption[] } | BatchOption[] }>('/api/batches?limit=100')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
        // Filter out current batch and archived batches
        let candidates = list.filter((b) => b.id !== currentBatchId && !b.isArchived);
        // If teacher, restrict to batches assigned to them
        if (user?.role === 'TEACHER') {
          candidates = candidates.filter((b) => b.teacherId === user.id);
        }
        setBatches(candidates);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load batches');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, currentBatchId, user]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const handleCopy = async () => {
    if (!selectedBatchIds.length) {
      setError('Please select at least one target batch');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiPost<{ success: boolean; message?: string }>(`/api/materials/${materialId}/copy`, {
        batchIds: selectedBatchIds,
      });

      if (res && res.success) {
        toast.success(`Material copied to ${selectedBatchIds.length} batch(es)`);
        onCopied();
        onClose();
      } else {
        setError(res.message || 'Failed to copy material');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error copying material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Copy Material to Other Batches"
      description={`Duplicate "${materialTitle}" into other batches in your branch.`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
          </div>
        ) : batches.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-[var(--radius-control)]">
            No other eligible batches found in your branch to copy to.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {batches.map((batch) => {
              const isSelected = selectedBatchIds.includes(batch.id);
              return (
                <div
                  key={batch.id}
                  onClick={() => toggleBatch(batch.id)}
                  className={`flex items-center justify-between p-3 rounded-[var(--radius-control)] border text-xs cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary-subtle text-foreground'
                      : 'border-border bg-surface hover:bg-surface-hover text-muted-foreground'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-foreground truncate">{batch.name}</p>
                    {batch.subject && (
                      <p className="text-[11px] text-muted-foreground truncate">Subject: {batch.subject.name}</p>
                    )}
                  </div>
                  <div
                    className={`h-5 w-5 rounded flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-surface'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCopy}
            disabled={batches.length === 0 || !selectedBatchIds.length}
            isLoading={submitting}
            className="gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Material ({selectedBatchIds.length})</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
