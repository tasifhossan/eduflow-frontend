'use client';

import * as React from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Save, CheckCircle2, Users } from 'lucide-react';

interface StudentRow {
  studentId: string;
  name: string;
  studentCode: string;
  marks: string;
  feedback: string;
  absent: boolean;
  status?: string;
  saved?: boolean;
}

export interface OfflineMarksGridProps {
  assignmentId: string;
  totalMarks: number;
  batchId: string;
  onSaved?: () => void;
}

export function OfflineMarksGrid({
  assignmentId,
  totalMarks,
  batchId,
  onSaved,
}: OfflineMarksGridProps) {
  const [rows, setRows] = React.useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSummary, setSaveSummary] = React.useState<string | null>(null);

  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map());

  // Load students & existing submissions
  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        // 1. Fetch batch students
        const batchRes = await apiGet<{
          success: boolean;
          data: {
            enrollments?: Array<{
              id?: string;
              studentId?: string;
              name?: string;
              studentCode?: string | null;
              student?: { id: string; name: string; studentCode?: string | null };
            }>;
            students?: Array<{
              id?: string;
              studentId?: string;
              name?: string;
              studentCode?: string | null;
              student?: { id: string; name: string; studentCode?: string | null };
            }>;
          };
        }>(`/api/batches/${batchId}`);
        const enrolled = batchRes?.data?.enrollments || batchRes?.data?.students || [];

        // 2. Fetch existing submissions for this assignment
        const subRes = await apiGet<{
          success: boolean;
          data: {
            items: Array<{
              studentId?: string;
              student?: { id: string };
              marks?: number | null;
              marksObtained?: number | null;
              feedback?: string | null;
              status?: string;
            }>;
          };
        }>(`/api/assignments/${assignmentId}/submissions?limit=100`);
        const submissions = subRes?.data?.items || [];

        if (!active) return;

        const initialRows: StudentRow[] = enrolled.map((item) => {
          const sId = item.student?.id || item.studentId || item.id || '';
          const sName = item.student?.name || item.name || '';
          const sCode = item.student?.studentCode || item.studentCode || '—';
          const sub = submissions.find(
            (s) => (s.student && s.student.id === sId) || s.studentId === sId
          );

          const currentMarks =
            sub?.marks !== null && sub?.marks !== undefined
              ? String(sub.marks)
              : sub?.marksObtained !== null && sub?.marksObtained !== undefined
              ? String(sub.marksObtained)
              : '';

          return {
            studentId: sId,
            name: sName,
            studentCode: sCode,
            marks: currentMarks,
            feedback: sub?.feedback || '',
            absent: sub?.feedback === 'Absent' && currentMarks === '0',
            status: sub?.status,
            saved: sub?.status === 'GRADED',
          };
        });

        setRows(initialRows);
      } catch {
        if (active) toast.error('Failed to load student roster for offline marks entry');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [assignmentId, batchId]);

  const handleMarksChange = (index: number, val: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], marks: val, absent: false, saved: false };
      return next;
    });
  };

  const handleFeedbackChange = (index: number, val: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], feedback: val, saved: false };
      return next;
    });
  };

  const handleAbsentToggle = (index: number, absent: boolean) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        absent,
        marks: absent ? '0' : '',
        feedback: absent ? 'Absent' : '',
        saved: false,
      };
      return next;
    });
  };

  // Keyboard navigation: Enter or ArrowDown moves to next student's marks input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRef = inputRefs.current.get(index + 1);
      nextRef?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRef = inputRefs.current.get(index - 1);
      prevRef?.focus();
    }
  };

  const handleBulkSave = async () => {
    // Validate marks
    for (const r of rows) {
      if (!r.absent && r.marks !== '') {
        const num = parseFloat(r.marks);
        if (isNaN(num) || num < 0 || num > totalMarks) {
          toast.error(`Invalid marks for ${r.name}: Must be between 0 and ${totalMarks}`);
          return;
        }
      }
    }

    setIsSaving(true);
    setSaveSummary(null);
    try {
      const entries = rows
        .filter((r) => r.absent || r.marks !== '')
        .map((r) => ({
          studentId: r.studentId,
          marks: r.absent ? 0 : parseFloat(r.marks),
          feedback: r.absent ? (r.feedback.trim() || 'Absent') : (r.feedback.trim() || undefined),
        }));

      if (entries.length === 0) {
        toast.info('No marks or attendance marked to save');
        setIsSaving(false);
        return;
      }

      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: { processed: number; successful: number; failed: number; results: unknown[] };
      }>(`/api/assignments/${assignmentId}/marks`, { entries });

      if (res?.success) {
        const successful = res.data?.successful ?? entries.length;
        const failed = res.data?.failed ?? 0;
        const summaryText = `Saved marks for ${successful} student${successful === 1 ? '' : 's'}${failed > 0 ? ` (${failed} failed)` : ''}`;

        setSaveSummary(summaryText);
        toast.success(summaryText);

        setRows((prev) =>
          prev.map((r) => {
            const wasIncluded = entries.some((e) => e.studentId === r.studentId);
            return wasIncluded ? { ...r, saved: true } : r;
          })
        );

        onSaved?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save offline marks';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
        <Spinner size="lg" />
        <span className="text-xs text-muted-foreground">Loading student roster...</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-[var(--radius-card)]">
        <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-xs font-semibold">No students enrolled in this batch</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface-hover/30">
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            In-Class Physical Marks Grid
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use Enter or Arrow Down keys for rapid numeric marks entry. Total maximum marks: <strong className="text-foreground">{totalMarks}</strong>
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleBulkSave}
          disabled={isSaving}
          className="gap-1.5 self-end sm:self-auto"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{isSaving ? 'Saving Marks...' : 'Bulk Save Marks'}</span>
        </Button>
      </div>

      {/* Summary notice banner */}
      {saveSummary && (
        <div
          role="status"
          className="p-3 rounded-[var(--radius-control)] border border-secondary/30 bg-secondary-subtle text-secondary text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{saveSummary}</span>
        </div>
      )}

      {/* Grid Table */}
      <div className="border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-hover/60 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                <th className="py-3 px-4 w-32">Marks ({totalMarks})</th>
                <th className="py-3 px-4 w-24 text-center">Absent</th>
                <th className="py-3 px-4 min-w-[200px]">Teacher Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => {
                const isInvalid =
                  !row.absent &&
                  row.marks !== '' &&
                  (isNaN(parseFloat(row.marks)) ||
                    parseFloat(row.marks) < 0 ||
                    parseFloat(row.marks) > totalMarks);

                return (
                  <tr
                    key={row.studentId}
                    className={`hover:bg-surface-hover/40 transition-colors ${
                      row.absent ? 'bg-danger-subtle/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center text-muted-foreground font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                      {row.studentCode}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current.set(idx, el);
                          else inputRefs.current.delete(idx);
                        }}
                        type="number"
                        step="any"
                        min={0}
                        max={totalMarks}
                        disabled={row.absent}
                        value={row.marks}
                        onChange={(e) => handleMarksChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        placeholder={row.absent ? 'Absent' : '0.0'}
                        className={`w-full h-8 px-2.5 text-xs font-mono rounded-[var(--radius-control)] border bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isInvalid
                            ? 'border-danger ring-1 ring-danger'
                            : 'border-border'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`absent-${row.studentId}`}
                          checked={row.absent}
                          onChange={(e) => handleAbsentToggle(idx, e.target.checked)}
                          aria-label={`Mark ${row.name} as absent`}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={row.feedback}
                        onChange={(e) => handleFeedbackChange(idx, e.target.value)}
                        placeholder="Optional remarks..."
                        className="w-full h-8 px-2.5 text-xs rounded-[var(--radius-control)] border border-border bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
