'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney, formatDate } from '@/lib/format';
import { toMinor } from '@/lib/money';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface ReportGroup {
  key: string;
  label: string;
  total: string;
  count: number;
}

interface ReversedPaymentItem {
  paymentId: string;
  receiptNumber: string;
  amount: string;
  reversedAt: string;
  reason: string;
}

interface CollectionReportResponse {
  from: string;
  to: string;
  groupBy: 'day' | 'method' | 'batch' | 'receiver';
  summary: {
    totalCollected: string;
    totalReversed: string;
    netCollection: string;
    activePaymentsCount: number;
    reversedPaymentsCount: number;
  };
  groups: ReportGroup[];
  reversedPayments: ReversedPaymentItem[];
}

interface BatchOption {
  id: string;
  name: string;
}

export default function CollectionReportPage() {
  const { center } = useCenter();

  // Date filters: 1st of current month to today
  const [fromDate, setFromDate] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = React.useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [groupBy, setGroupBy] = React.useState<'day' | 'method' | 'batch' | 'receiver'>('day');
  const [batchId, setBatchId] = React.useState('');

  // Data
  const [report, setReport] = React.useState<CollectionReportResponse | null>(null);
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  const refetchReport = React.useCallback(() => {
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
        // Ignore
      }
    }
    loadBatches();
  }, []);

  // Fetch report
  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const q = new URLSearchParams({
          from: fromDate,
          to: toDate,
          groupBy,
        });
        if (batchId) q.set('batchId', batchId);

        const res = await apiGet<{ success: boolean; data: CollectionReportResponse }>(
          `/api/fees/reports/collection?${q.toString()}`
        );
        if (!ignore) {
          if (res?.success && res.data) {
            setReport(res.data);
            setError(null);
          } else {
            setError('Failed to load collection report data.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Network error: Unable to load financial report.');
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
  }, [fromDate, toDate, groupBy, batchId, reloadTrigger]);

  // Max group total for CSS bar widths
  const maxTotalMinor = React.useMemo(() => {
    const ZERO = BigInt(0);
    const ONE = BigInt(1);
    if (!report?.groups || report.groups.length === 0) return ONE;
    let max = ZERO;
    for (const g of report.groups) {
      const m = toMinor(g.total);
      if (m > max) max = m;
    }
    return max > ZERO ? max : ONE;
  }, [report]);

  // CSV Export
  const handleExportCsv = () => {
    if (!report) return;
    let csv = '\uFEFF';
    csv += 'Group,Label,Count,Total Amount\n';
    for (const g of report.groups) {
      csv += `"${g.key}","${g.label.replace(/"/g, '""')}",${g.count},"${g.total}"\n`;
    }
    if (report.reversedPayments.length > 0) {
      csv += '\nReversed Payments\n';
      csv += 'Receipt Number,Amount,Reversed At,Reason\n';
      for (const r of report.reversedPayments) {
        csv += `"${r.receiptNumber}","${r.amount}","${r.reversedAt}","${r.reason.replace(/"/g, '""')}"\n`;
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `collection-report-${fromDate}-to-${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Fee Collection Reports"
          description="Detailed financial analytics, group breakdown, and transaction status reconciliation"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!report || report.groups.length === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export Report CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="report-from" className="text-xs font-semibold text-muted-foreground">
                From Date
              </label>
              <input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="report-to" className="text-xs font-semibold text-muted-foreground">
                To Date
              </label>
              <input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="report-group-by" className="text-xs font-semibold text-muted-foreground">
                Group By
              </label>
              <select
                id="report-group-by"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'method' | 'batch' | 'receiver')}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              >
                <option value="day">Day</option>
                <option value="method">Payment Method</option>
                <option value="batch">Batch</option>
                <option value="receiver">Received By Staff</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="report-batch" className="text-xs font-semibold text-muted-foreground">
                Batch Scope
              </label>
              <select
                id="report-batch"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Collections
            </div>
            <div className="mt-2 text-2xl font-bold text-status-success-text">
              {formatMoney(report.summary.totalCollected, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.summary.activePaymentsCount} active transaction(s)
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reversed Payments
            </div>
            <div className="mt-2 text-2xl font-bold text-status-danger-text">
              {formatMoney(report.summary.totalReversed, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.summary.reversedPaymentsCount} reversed transaction(s)
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Net Revenue
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {formatMoney(report.summary.netCollection, center.currency, center.currencySymbol)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Net of reversals</div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Transactions
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {report.summary.activePaymentsCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Across selected period</div>
          </div>
        </div>
      )}

      {/* Token-Colored Bar List Visualization (CSS Only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Collection Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RotateCw className="h-5 w-5 animate-spin text-primary" />
              Calculating collection report...
            </div>
          ) : error ? (
            <ErrorState title="Error Loading Report" message={error} onRetry={refetchReport} />
          ) : !report || report.groups.length === 0 ? (
            <EmptyState
              title="No collections recorded"
              description="No payment collections found in the selected date range."
            />
          ) : (
            <div className="space-y-4">
              {report.groups.map((group) => {
                const groupMinor = toMinor(group.total);
                const pct = Math.max(
                  4,
                  Math.min(100, Math.round((Number(groupMinor) / Number(maxTotalMinor)) * 100))
                );

                return (
                  <div key={group.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{group.label}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {group.count} payment(s)
                        </span>
                      </div>
                      <div className="font-mono font-bold text-foreground">
                        {formatMoney(group.total, center.currency, center.currencySymbol)}
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-[var(--radius-pill)] bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-[var(--radius-pill)] bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reversed Payments Breakdown */}
      {report && report.reversedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-status-danger-text flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reversed Payments in Period ({report.reversedPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Receipt Number</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Reversed Date</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.reversedPayments.map((r) => (
                    <tr key={r.paymentId} className="hover:bg-surface-hover/50 transition">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                        <Link
                          href={`/fees/receipts/${r.paymentId}`}
                          className="text-primary hover:underline"
                        >
                          {r.receiptNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-status-danger-text">
                        {formatMoney(r.amount, center.currency, center.currencySymbol)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.reversedAt, center.timezone)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground italic">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
