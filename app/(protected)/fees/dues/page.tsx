'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Sparkles,
  RotateCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface DuesItem {
  studentId: string;
  name: string;
  studentCode: string;
  phone: string;
  totalDue: string;
  totalPaid: string;
  outstanding: string;
  status: string;
}

interface DuesResponse {
  summary: {
    totalDue: string;
    totalPaid: string;
    totalOutstanding: string;
    totalStudentsWithDues: number;
  };
  items: DuesItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BatchOption {
  id: string;
  name: string;
}

interface GenerateDuesResult {
  dryRun: boolean;
  month: string;
  createdCount: number;
  totalAmount: string;
  skippedCount: number;
  created?: unknown[];
  skipped?: unknown[];
}

export default function DuesPage() {
  const { center } = useCenter();
  const searchParams = useSearchParams();

  // Filters
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(() => searchParams.get('batchId') || '');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  // Data states
  const [duesData, setDuesData] = React.useState<DuesResponse | null>(null);
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Generate Dues Dialog State
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [genMonth, setGenMonth] = React.useState(selectedMonth);
  const [genBatchId, setGenBatchId] = React.useState('');
  const [isDryRunning, setIsDryRunning] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [genPreview, setGenPreview] = React.useState<GenerateDuesResult | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [genSuccessMsg, setGenSuccessMsg] = React.useState<string | null>(null);

  const refetchDues = React.useCallback(() => {
    setIsLoading(true);
    setReloadTrigger((c) => c + 1);
  }, []);

  // Fetch batches
  React.useEffect(() => {
    async function loadBatches() {
      try {
        const res = await apiGet<{ success: boolean; data: BatchOption[] }>('/api/batches');
        if (res?.success && Array.isArray(res.data)) {
          setBatches(res.data);
        }
      } catch {
        // Ignore batch error
      }
    }
    loadBatches();
  }, []);

  // Fetch dues
  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: '20',
          month: selectedMonth,
          status: selectedStatus,
        });
        if (selectedBatchId) q.set('batchId', selectedBatchId);

        const res = await apiGet<{ success: boolean; data: DuesResponse }>(`/api/fees/dues?${q.toString()}`);
        if (!ignore) {
          if (res?.success && res.data) {
            setDuesData(res.data);
            setError(null);
          } else {
            setError('Failed to fetch outstanding dues.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Network error: Unable to load dues statement.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [page, selectedMonth, selectedBatchId, selectedStatus, reloadTrigger]);

  // CSV Export
  const handleExportCsv = () => {
    const q = new URLSearchParams({
      format: 'csv',
      month: selectedMonth,
      status: selectedStatus,
    });
    if (selectedBatchId) q.set('batchId', selectedBatchId);
    window.open(`/api/fees/dues?${q.toString()}`, '_blank');
  };

  // Dry run dues generation
  const handleDryRun = async () => {
    setIsDryRunning(true);
    setGenError(null);
    setGenPreview(null);
    try {
      const res = await apiPost<{ success: boolean; message?: string; data: GenerateDuesResult }>(
        '/api/fees/charges/generate',
        {
          month: genMonth,
          batchId: genBatchId || undefined,
          dryRun: true,
        }
      );
      if (res?.success && res.data) {
        setGenPreview(res.data);
      } else {
        setGenError(res?.message || 'Dry run generation preview failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing dry run.';
      setGenError(msg);
    } finally {
      setIsDryRunning(false);
    }
  };

  // Confirm and Generate Dues
  const handleConfirmGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await apiPost<{ success: boolean; message?: string; data: GenerateDuesResult }>(
        '/api/fees/charges/generate',
        {
          month: genMonth,
          batchId: genBatchId || undefined,
          dryRun: false,
        }
      );
      if (res?.success && res.data) {
        setGenSuccessMsg(
          `Successfully generated ${res.data.createdCount} dues charges totaling ${formatMoney(
            res.data.totalAmount,
            center.currency,
            center.currencySymbol
          )}.`
        );
        setTimeout(() => {
          setShowGenerateModal(false);
          setGenPreview(null);
          setGenSuccessMsg(null);
          refetchDues();
        }, 1500);
      } else {
        setGenError(res?.message || 'Generation failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating dues.';
      setGenError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const isMonthEmpty = duesData && duesData.summary.totalStudentsWithDues === 0 && !selectedBatchId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Student Dues & Billing"
          description="Track outstanding balances, generate monthly charges, and review collection statuses"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!duesData || duesData.items.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setGenMonth(selectedMonth);
              setGenBatchId(selectedBatchId);
              setGenPreview(null);
              setGenError(null);
              setShowGenerateModal(true);
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Generate Dues
          </Button>
        </div>
      </div>

      {/* Prominent Banner when selected month has no dues generated */}
      {isMonthEmpty && !isLoading && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground text-sm">
                Fees for {selectedMonth} have not been generated yet
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate monthly tuition fees for all active student enrollments according to batch fee schedules.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setGenMonth(selectedMonth);
              setGenBatchId('');
              setGenPreview(null);
              setGenError(null);
              setShowGenerateModal(true);
            }}
          >
            Generate {selectedMonth} Dues
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      {duesData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Outstanding Dues
            </div>
            <div className="mt-2 text-2xl font-bold text-status-danger-text">
              {formatMoney(duesData.summary.totalOutstanding, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Pending collections</div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Month Due
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {formatMoney(duesData.summary.totalDue, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Billed amount</div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Collected
            </div>
            <div className="mt-2 text-2xl font-bold text-status-success-text">
              {formatMoney(duesData.summary.totalPaid, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Settled payments</div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Students With Dues
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {duesData.summary.totalStudentsWithDues}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Accounts with balance &gt; 0</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Month Filter */}
            <div className="space-y-1">
              <label htmlFor="filter-month" className="text-xs font-semibold text-muted-foreground">
                Billing Month (YYYY-MM)
              </label>
              <input
                id="filter-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            {/* Batch Filter */}
            <div className="space-y-1">
              <label htmlFor="filter-batch" className="text-xs font-semibold text-muted-foreground">
                Batch
              </label>
              <select
                id="filter-batch"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label htmlFor="filter-status" className="text-xs font-semibold text-muted-foreground">
                Payment Status
              </label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="DUE">Due (Unpaid)</option>
                <option value="PARTIAL">Partial</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PAID">Fully Paid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dues List Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RotateCw className="h-5 w-5 animate-spin text-primary" />
              Loading student dues...
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState title="Error Loading Dues" message={error} onRetry={refetchDues} />
            </div>
          ) : !duesData || duesData.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No dues found"
                description={`No student dues records found for ${selectedMonth} matching current filters.`}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-right">Total Due</th>
                      <th className="px-4 py-3 text-right">Total Paid</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {duesData.items.map((r) => (
                      <tr key={r.studentId} className="hover:bg-surface-hover/50 transition">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <Link
                            href={`/fees/students/${r.studentId}`}
                            className="text-foreground hover:text-primary transition"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.studentCode || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.phone || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {formatMoney(r.totalDue, center.currency, center.currencySymbol)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-status-success-text">
                          {formatMoney(r.totalPaid, center.currency, center.currencySymbol)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-status-danger-text">
                          {formatMoney(r.outstanding, center.currency, center.currencySymbol)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge
                            variant={
                              r.status.includes('OVERDUE')
                                ? 'overdue'
                                : r.status.includes('PARTIAL')
                                ? 'partial'
                                : r.status.includes('DUE')
                                ? 'due'
                                : 'paid'
                            }
                            label={r.status}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/fees/students/${r.studentId}`}
                              className="rounded-[var(--radius-control)] border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                            >
                              Ledger
                            </Link>
                            <Link
                              href="/fees/collect"
                              className="rounded-[var(--radius-control)] bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
                            >
                              Collect
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {duesData.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-border">
                  <Pagination
                    currentPage={page}
                    totalPages={duesData.pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Generate Dues Modal */}
      {showGenerateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowGenerateModal(false)}
          title="Generate Monthly Dues"
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Scans active enrollments for monthly batches and creates individual fee charges according to center billing rules.
              Idempotent: duplicate charges for the same student, batch, and month are safely prevented.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="gen-month" className="text-sm font-semibold text-foreground">
                  Month <span className="text-status-danger-text">*</span>
                </label>
                <input
                  id="gen-month"
                  type="month"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-batch" className="text-sm font-semibold text-foreground">
                  Batch Scope
                </label>
                <select
                  id="gen-batch"
                  value={genBatchId}
                  onChange={(e) => setGenBatchId(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                >
                  <option value="">All Batches (Center-wide)</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dry Run Preview Box */}
            {genPreview && (
              <div className="rounded-[var(--radius-control)] border border-border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-status-success-text" />
                  Dry Run Calculation Summary ({genPreview.month})
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    Charges to Create: <span className="font-bold text-foreground">{genPreview.createdCount}</span>
                  </div>
                  <div>
                    Total Sum:{' '}
                    <span className="font-bold text-status-success-text">
                      {formatMoney(genPreview.totalAmount, center.currency, center.currencySymbol)}
                    </span>
                  </div>
                  <div>
                    Already Generated / Skipped:{' '}
                    <span className="font-bold text-foreground">{genPreview.skippedCount}</span>
                  </div>
                </div>
              </div>
            )}

            {genError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {genError}
              </div>
            )}

            {genSuccessMsg && (
              <div className="rounded-[var(--radius-control)] border border-status-success-border bg-status-success-bg p-3 text-xs text-status-success-text">
                {genSuccessMsg}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDryRun}
                disabled={isDryRunning || isGenerating}
              >
                {isDryRunning ? (
                  <span className="flex items-center gap-1">
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    Calculating...
                  </span>
                ) : (
                  'Preview Dry Run'
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-1">
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Confirm & Generate Dues'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
