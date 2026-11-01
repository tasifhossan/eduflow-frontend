'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiPut } from '@/lib/api';
import {
  ReportPeriod,
  ReportCardsRosterResponse,
  StudentFullReportCard,
} from '@/lib/types/report-card';
import { PrintableReportCard } from '@/components/report-card/printable-report-card';
import {
  FileText,
  Plus,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  Users,
  Search,
  ExternalLink,
} from 'lucide-react';

interface BatchOption {
  id: string;
  name: string;
}

export default function StaffReportCardsPage() {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [rosterData, setRosterData] = useState<ReportCardsRosterResponse | null>(null);

  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Period Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ label: '', from: '', to: '' });

  // Publish Confirm Modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Remarks state: studentId -> { text: string, status: 'idle' | 'saving' | 'saved' }
  const [remarks, setRemarks] = useState<
    Record<string, { text: string; status: 'idle' | 'saving' | 'saved' }>
  >({});
  const remarkDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Printing state
  const [printSingleCard, setPrintSingleCard] = useState<StudentFullReportCard | null>(null);
  const [printAllCards, setPrintAllCards] = useState<StudentFullReportCard[]>([]);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // 1. Fetch batches
  useEffect(() => {
    async function loadBatches() {
      try {
        setLoadingBatches(true);
        const res = await apiGet<{ success: boolean; data: BatchOption[] | { items?: BatchOption[] } }>('/api/batches');
        const batchList = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0].id);
        }
      } catch (err) {
        toast.error('Failed to load batches');
      } finally {
        setLoadingBatches(false);
      }
    }
    loadBatches();
  }, []);

  // 2. Fetch report periods when batch changes
  useEffect(() => {
    if (!selectedBatchId) return;

    async function loadPeriods() {
      try {
        setLoadingPeriods(true);
        const res = await apiGet<{ success: boolean; data: ReportPeriod[] }>(
          `/api/batches/${selectedBatchId}/report-periods`
        );
        const periodList = Array.isArray(res.data) ? res.data : [];
        setPeriods(periodList);
        if (periodList.length > 0) {
          setSelectedPeriodId(periodList[0].id);
        } else {
          setSelectedPeriodId('');
          setRosterData(null);
        }
      } catch (err) {
        toast.error('Failed to load report periods');
      } finally {
        setLoadingPeriods(false);
      }
    }
    loadPeriods();
  }, [selectedBatchId]);

  // 3. Fetch roster cards when period changes
  const fetchRosterCards = useCallback(async () => {
    if (!selectedPeriodId) return;
    try {
      setLoadingCards(true);
      const res = await apiGet<{ success: boolean; data: ReportCardsRosterResponse }>(
        `/api/report-periods/${selectedPeriodId}/cards?limit=100`
      );
      if (res.data) {
        setRosterData(res.data);

        // Initialize remarks map
        const initialRemarks: Record<string, { text: string; status: 'idle' | 'saving' | 'saved' }> = {};
        for (const c of res.data.cards) {
          initialRemarks[c.student.id] = {
            text: c.remark?.text || '',
            status: 'idle',
          };
        }
        setRemarks(initialRemarks);
      }
    } catch (err) {
      toast.error('Failed to load report cards roster');
    } finally {
      setLoadingCards(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchRosterCards();
  }, [fetchRosterCards]);

  // Handle Create Period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    if (!createForm.label.trim()) {
      toast.error('Period label is required');
      return;
    }
    if (!createForm.from || !createForm.to) {
      toast.error('From and To dates are required');
      return;
    }
    if (new Date(createForm.from) > new Date(createForm.to)) {
      toast.error('From date cannot be after To date');
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiPost<{ success: boolean; data: ReportPeriod }>('/api/report-periods', {
        batchId: selectedBatchId,
        label: createForm.label.trim(),
        from: createForm.from,
        to: createForm.to,
      });

      toast.success('Report period created');
      setIsCreateOpen(false);
      setCreateForm({ label: '', from: '', to: '' });

      // Refresh periods and select new one
      const periodsRes = await apiGet<{ success: boolean; data: ReportPeriod[] }>(
        `/api/batches/${selectedBatchId}/report-periods`
      );
      const updatedList = Array.isArray(periodsRes.data) ? periodsRes.data : [];
      setPeriods(updatedList);
      if (res.data?.id) {
        setSelectedPeriodId(res.data.id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create report period');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Publish / Unpublish Toggle
  const handleTogglePublish = async () => {
    const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
    if (!currentPeriod) return;

    const isPublished = Boolean(currentPeriod.publishedAt);
    const endpoint = isPublished
      ? `/api/report-periods/${selectedPeriodId}/unpublish`
      : `/api/report-periods/${selectedPeriodId}/publish`;

    try {
      setActionLoading(true);
      await apiPost(endpoint);
      toast.success(isPublished ? 'Report period unpublished' : 'Report period published');
      setIsPublishModalOpen(false);

      // Refresh periods
      const periodsRes = await apiGet<{ success: boolean; data: ReportPeriod[] }>(
        `/api/batches/${selectedBatchId}/report-periods`
      );
      setPeriods(Array.isArray(periodsRes.data) ? periodsRes.data : []);
      fetchRosterCards();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Autosave remark handler
  const saveRemark = async (studentId: string, text: string) => {
    try {
      setRemarks((prev) => ({
        ...prev,
        [studentId]: { text, status: 'saving' },
      }));

      await apiPut(`/api/report-periods/${selectedPeriodId}/remarks/${studentId}`, {
        remark: text,
      });

      setRemarks((prev) => ({
        ...prev,
        [studentId]: { text, status: 'saved' },
      }));

      setTimeout(() => {
        setRemarks((prev) => ({
          ...prev,
          [studentId]: { ...prev[studentId], status: 'idle' },
        }));
      }, 2000);
    } catch (err) {
      toast.error('Failed to save remark');
      setRemarks((prev) => ({
        ...prev,
        [studentId]: { text, status: 'idle' },
      }));
    }
  };

  const handleRemarkChange = (studentId: string, newText: string) => {
    if (newText.length > 600) return;

    setRemarks((prev) => ({
      ...prev,
      [studentId]: { text: newText, status: 'idle' },
    }));

    if (remarkDebounceTimers.current[studentId]) {
      clearTimeout(remarkDebounceTimers.current[studentId]);
    }

    remarkDebounceTimers.current[studentId] = setTimeout(() => {
      saveRemark(studentId, newText);
    }, 800);
  };

  // Handle single student print
  const handlePrintStudent = async (studentId: string) => {
    try {
      setLoadingPrint(true);
      const res = await apiGet<{ success: boolean; data: StudentFullReportCard }>(
        `/api/report-periods/${selectedPeriodId}/cards/${studentId}`
      );
      if (res.data) {
        setPrintSingleCard(res.data);
      }
    } catch (err) {
      toast.error('Failed to load student report card for printing');
    } finally {
      setLoadingPrint(false);
    }
  };

  // Handle print all students
  const handlePrintAll = async () => {
    if (!rosterData || rosterData.cards.length === 0) {
      toast.error('No students to print');
      return;
    }

    try {
      setLoadingPrint(true);
      const allCards: StudentFullReportCard[] = [];
      for (const c of rosterData.cards) {
        const res = await apiGet<{ success: boolean; data: StudentFullReportCard }>(
          `/api/report-periods/${selectedPeriodId}/cards/${c.student.id}`
        );
        if (res.data) {
          allCards.push(res.data);
        }
      }
      setPrintAllCards(allCards);
    } catch (err) {
      toast.error('Failed to load all report cards for printing');
    } finally {
      setLoadingPrint(false);
    }
  };

  const activePeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Cards Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic periods, evaluate grades, enter teacher remarks, and publish student cards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          disabled={!selectedBatchId || actionLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Report Period
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="p-4 rounded-card border border-border bg-surface flex flex-wrap items-center gap-4">
        {/* Batch Select */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Batch</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            disabled={loadingBatches || actionLoading || batches.length === 0}
            className="w-full px-3 py-2 rounded-control border border-border bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-60"
          >
            {loadingBatches ? (
              <option value="">Loading batches...</option>
            ) : batches.length === 0 ? (
              <option value="">No batches available</option>
            ) : (
              <>
                <option value="" disabled>Select a batch...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Period Select */}
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Report Period {loadingPeriods && '...'}
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            disabled={loadingPeriods || periods.length === 0}
            className="w-full px-3 py-2 rounded-control border border-border bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {periods.length === 0 ? (
              <option value="">No report periods for this batch</option>
            ) : (
              periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.from} to {p.to}) {p.publishedAt ? '✓ Published' : '· Draft'}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Actions for Active Period */}
        {activePeriod && (
          <div className="flex items-center gap-2 pt-5">
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold transition-colors cursor-pointer ${
                activePeriod.publishedAt
                  ? 'bg-warning-subtle text-warning hover:bg-warning hover:text-warning-foreground'
                  : 'bg-success-subtle text-success hover:bg-success hover:text-success-foreground'
              }`}
            >
              {activePeriod.publishedAt ? (
                <>
                  <Unlock className="h-3.5 w-3.5" /> Unpublish
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Publish to Students
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={loadingPrint || !rosterData || rosterData.cards.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-control border border-border bg-background hover:bg-surface text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print All Cards
            </button>
          </div>
        )}
      </div>

      {/* Pending Written Grading Warning Banner */}
      {rosterData && rosterData.pendingTests.length > 0 && (
        <div className="p-4 rounded-card border border-warning/30 bg-warning-subtle text-warning flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold block">Attention: Written answers awaiting grading</span>
            <p className="mt-0.5 text-xs opacity-90">
              The following exams have written questions waiting for teacher marks. These tests are marked as
              pending and excluded from student total scores until graded:
            </p>
            <ul className="mt-1 list-disc list-inside text-xs font-medium space-y-0.5">
              {rosterData.pendingTests.map((t) => (
                <li key={t.id}>
                  {t.title} — {t.pendingCount} student{t.pendingCount === 1 ? '' : 's'} waiting
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Roster Table Section */}
      <div className="rounded-card border border-border bg-surface overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Class Roster Evaluation ({rosterData?.cards.length || 0} students)
          </h2>
          {activePeriod && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-pill font-semibold ${
                activePeriod.publishedAt
                  ? 'bg-success-subtle text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {activePeriod.publishedAt ? 'Published to Guardians & Students' : 'Draft — Staff Only'}
            </span>
          )}
        </div>

        {loadingCards ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing student performance data...
          </div>
        ) : !selectedPeriodId ? (
          <div className="p-12 text-center text-muted-foreground text-sm max-w-md mx-auto">
            {batches.length === 0
              ? 'No batches found. Please create a batch before managing report periods and cards.'
              : periods.length === 0
              ? 'No report periods found for this batch. Click "Create Report Period" above to get started.'
              : 'Please select a report period above to review student report cards.'}
          </div>
        ) : rosterData?.cards.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No students enrolled in this batch during the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase font-semibold border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-3 py-3 text-center">Attendance %</th>
                  <th className="px-3 py-3 text-center">Exam %</th>
                  <th className="px-3 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 min-w-[320px]">Teacher Remark (Autosaved)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rosterData?.cards.map((item) => {
                  const studentId = item.student.id;
                  const currentRemark = remarks[studentId]?.text ?? (item.remark?.text || '');
                  const status = remarks[studentId]?.status || 'idle';

                  return (
                    <tr key={studentId} className="hover:bg-surface-hover/50 transition-colors">
                      {/* Student info */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{item.student.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.student.studentCode || 'No code'}
                        </div>
                      </td>

                      {/* Attendance % */}
                      <td className="px-3 py-3 text-center">
                        <div className="font-bold text-base">{item.attendance.percent}%</div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.attendance.present}P · {item.attendance.late}L · {item.attendance.absent}A
                        </div>
                      </td>

                      {/* Exam % */}
                      <td className="px-3 py-3 text-center">
                        <div className="font-bold text-base">{item.exam.overallPercent}%</div>
                        {item.exam.hasPendingWritten && (
                          <span className="inline-block text-[10px] text-warning font-semibold">
                            Pending test
                          </span>
                        )}
                      </td>

                      {/* Grade */}
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-pill bg-primary-subtle text-primary font-bold text-sm">
                          {item.exam.grade || '—'}
                        </span>
                      </td>

                      {/* Inline Remark Editor */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <textarea
                            value={currentRemark}
                            onChange={(e) => handleRemarkChange(studentId, e.target.value)}
                            placeholder="Enter qualitative remark (max 600 chars)..."
                            rows={2}
                            maxLength={600}
                            className="w-full px-2.5 py-1.5 rounded-control border border-border bg-background text-xs resize-none focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 mt-0.5">
                            <span>
                              {status === 'saving' && <span className="text-primary font-medium">Saving...</span>}
                              {status === 'saved' && <span className="text-success font-medium">✓ Saved</span>}
                            </span>
                            <span>{currentRemark.length} / 600</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintStudent(studentId)}
                          disabled={loadingPrint}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control border border-border bg-background hover:bg-surface text-xs font-semibold cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PERIOD MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg">Create Report Period</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Period Label (e.g. Midterm 2026, Term 1 Final)
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder="Midterm Examination 2026"
                  className="w-full px-3 py-2 rounded-control border border-border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.from}
                    onChange={(e) => setCreateForm({ ...createForm, from: e.target.value })}
                    className="w-full px-3 py-2 rounded-control border border-border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.to}
                    onChange={(e) => setCreateForm({ ...createForm, to: e.target.value })}
                    className="w-full px-3 py-2 rounded-control border border-border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-control border border-border bg-background text-sm font-semibold hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM PUBLISH/UNPUBLISH MODAL */}
      {isPublishModalOpen && activePeriod && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
            <h3 className="font-bold text-lg">
              {activePeriod.publishedAt ? 'Unpublish Report Period?' : 'Publish Report Period?'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activePeriod.publishedAt
                ? 'Unpublishing will hide this report period and all report cards from students and linked guardians. You will be able to edit the period dates and label again.'
                : 'Publishing will immediately make these report cards visible to enrolled students and their guardians. Editing period dates or labels will be locked until unpublished.'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 rounded-control border border-border bg-background text-sm font-semibold hover:bg-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTogglePublish}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-control text-sm font-semibold transition-colors cursor-pointer ${
                  activePeriod.publishedAt
                    ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                }`}
              >
                {actionLoading ? 'Processing...' : activePeriod.publishedAt ? 'Confirm Unpublish' : 'Confirm Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE PRINT MODAL */}
      {printSingleCard && (
        <div className="fixed inset-0 z-50 bg-background/90 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex items-center justify-between mb-4 print:hidden">
            <button
              type="button"
              onClick={() => setPrintSingleCard(null)}
              className="px-3 py-1.5 rounded-control border border-border bg-surface text-sm font-semibold hover:bg-surface-hover cursor-pointer"
            >
              ← Back to Report Cards
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Report Card
            </button>
          </div>

          <div className="w-full max-w-3xl">
            <PrintableReportCard card={printSingleCard} />
          </div>

          {/* Embedded Print CSS */}
          <style jsx global>{`
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              header,
              nav,
              aside,
              .print\\:hidden {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              .report-card-container {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* PRINT ALL MODAL */}
      {printAllCards.length > 0 && (
        <div className="fixed inset-0 z-50 bg-background/90 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex items-center justify-between mb-4 print:hidden">
            <button
              type="button"
              onClick={() => setPrintAllCards([])}
              className="px-3 py-1.5 rounded-control border border-border bg-surface text-sm font-semibold hover:bg-surface-hover cursor-pointer"
            >
              ← Back to Report Cards
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print All ({printAllCards.length} Cards)
            </button>
          </div>

          <div className="w-full max-w-3xl space-y-12 print:space-y-0">
            {printAllCards.map((card, idx) => (
              <div key={card.student.id} className="print:break-after-page">
                <PrintableReportCard card={card} pageBreakAfter={idx < printAllCards.length - 1} />
              </div>
            ))}
          </div>

          {/* Embedded Print CSS */}
          <style jsx global>{`
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              header,
              nav,
              aside,
              .print\\:hidden {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              .report-card-container {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
              }
              .break-after-page {
                page-break-after: always !important;
                break-after: page !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

