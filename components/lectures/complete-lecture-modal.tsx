'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

export interface CompleteLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  lecture: {
    id: string;
    title: string;
    batchId: string;
    subjectId: string;
    chapterId?: string | null;
  };
}

export function CompleteLectureModal({
  isOpen,
  onClose,
  onSuccess,
  lecture,
}: CompleteLectureModalProps) {
  const router = useRouter();
  const [coveredTopics, setCoveredTopics] = React.useState('');
  const [homeworkNote, setHomeworkNote] = React.useState('');
  const [createAssignmentShortcut, setCreateAssignmentShortcut] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; data: unknown }>(
        `/api/lectures/${lecture.id}/complete`,
        {
          coveredTopics: coveredTopics.trim() || undefined,
          homeworkNote: homeworkNote.trim() || undefined,
        }
      );

      if (res?.success) {
        toast.success('Lecture marked as completed. Syllabus progress updated!');
        onSuccess(res.data);
        onClose();

        if (createAssignmentShortcut) {
          const params = new URLSearchParams({
            batchId: lecture.batchId,
            subjectId: lecture.subjectId,
            ...(lecture.chapterId ? { chapterId: lecture.chapterId } : {}),
            title: `Homework: ${lecture.title}`,
            description: homeworkNote || 'Please complete and submit the assigned homework problems.',
          });
          router.push(`/assignments?create=true&${params.toString()}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark lecture as completed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Lecture as Completed"
      description={`Record topics covered and assigned homework for "${lecture.title}"`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Topics Covered in Class</label>
          <Textarea
            placeholder="Summary of formulas derived, sections taught, concepts explained..."
            rows={3}
            value={coveredTopics}
            onChange={(e) => setCoveredTopics(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Homework Note / Next Class Preparation</label>
          <Textarea
            placeholder="Exercises to solve, reading assignment, textbook problems..."
            rows={3}
            value={homeworkNote}
            onChange={(e) => setHomeworkNote(e.target.value)}
          />
        </div>

        {/* Shortcut checkbox */}
        <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30">
          <Checkbox
            id="createAssignment"
            checked={createAssignmentShortcut}
            onChange={(e) => setCreateAssignmentShortcut(e.target.checked)}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <label
              htmlFor="createAssignment"
              className="text-xs font-semibold text-foreground cursor-pointer block"
            >
              Create an assignment from this homework note
            </label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Automatically pre-fills a new assignment form with this batch and homework instructions.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? 'Saving...' : 'Mark Completed'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
