'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  ChevronLeft,
  Download,
} from 'lucide-react';
import { apiGet, ApiResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface LowAttendanceStudent {
  studentId: string;
  name: string;
  studentCode?: string | null;
  batchId: string;
  batchName: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  ratePercent: number;
}

interface BatchOption {
  id: string;
  name: string;
}

export default function LowAttendancePage() {
  // Filters
  const [threshold, setThreshold] = React.useState<number>(75);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');

  // Data state
  const [items, setItems] = React.useState<LowAttendanceStudent[]>([]);
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load batches on mount
  React.useEffect(() => {
    let active = true;
    async function loadBatches() {
      try {
        const res = await apiGet<ApiResponse<{ items: BatchOption[] }>>('/api/tables/batches?limit=100');
        if (!active) return;
        if (res.success && res.data?.items) {
          setBatches(res.data.items);
        }
      } catch {
        // ignore
      }
    }
    loadBatches();
    return () => {
      active = false;
    };
  }, []);

  // Refresh callback for retry
  const refreshReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('threshold', String(threshold));
      if (selectedBatchId) params.set('batchId', selectedBatchId);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await apiGet<
        ApiResponse<{
          items: LowAttendanceStudent[];
          threshold: number;
        }>
      >(`/api/attendance/low?${params.toString()}`);

      if (res.success && res.data) {
        setItems(res.data.items || []);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || 'Failed to load low attendance report');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error fetching report');
    } finally {
      setLoading(false);
    }
  }, [threshold, selectedBatchId, fromDate, toDate]);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const params = new URLSearchParams();
        params.set('threshold', String(threshold));
        if (selectedBatchId) params.set('batchId', selectedBatchId);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);

        const res = await apiGet<
          ApiResponse<{
            items: LowAttendanceStudent[];
            threshold: number;
          }>
        >(`/api/attendance/low?${params.toString()}`);

        if (!active) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setErrorMsg(null);
        } else {
          setErrorMsg(res.message || 'Failed to load low attendance report');
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Error fetching report');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [threshold, selectedBatchId, fromDate, toDate]);

  const csvDownloadUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    params.set('threshold', String(threshold));
    if (selectedBatchId) params.set('batchId', selectedBatchId);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    return `/api/attendance/low?${params.toString()}`;
  }, [threshold, selectedBatchId, fromDate, toDate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/attendance"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Attendance
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-warning" />
            Low Attendance Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Students whose attendance percentage is below the warning threshold.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={csvDownloadUrl}
            download="low-attendance-report.csv"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover hover:border-border-hover transition-colors"
          >
            <Download className="h-4 w-4 mr-1.5 text-muted-foreground" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Threshold Filter */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 75)))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-semibold text-muted-foreground">%</span>
            </div>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Filter by Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      {errorMsg ? (
        <ErrorState message={errorMsg} onRetry={refreshReport} />
      ) : loading ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No Students Below Threshold"
          description={`Great job! No students currently fall below the ${threshold}% attendance threshold for the selected filters.`}
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Students at Risk ({items.length})
            </span>
            <span className="text-xs text-muted-foreground">
              Threshold: &lt; {threshold}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3 text-center">Classes</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 w-48">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((student) => {
                  const isCritical = student.ratePercent < 50;
                  return (
                    <tr key={`${student.studentId}-${student.batchId}`} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div>{student.name}</div>
                        {student.studentCode && (
                          <div className="text-xs font-mono text-muted-foreground">
                            {student.studentCode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {student.batchName}
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-foreground">
                        {student.totalClasses}
                      </td>
                      <td className="px-4 py-3.5 text-center text-secondary font-medium">
                        {student.presentCount}
                      </td>
                      <td className="px-4 py-3.5 text-center text-danger font-semibold">
                        {student.absentCount}
                      </td>
                      <td className="px-4 py-3.5 text-center text-warning font-medium">
                        {student.lateCount}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold ${isCritical ? 'text-danger' : 'text-warning'}`}>
                              {student.ratePercent}%
                            </span>
                            <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                              {isCritical ? 'Critical' : 'Warning'}
                            </Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${isCritical ? 'bg-danger' : 'bg-warning'} transition-all`}
                              style={{ width: `${Math.min(100, student.ratePercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
