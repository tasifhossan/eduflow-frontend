'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  ChevronLeft,
  Download,
  Printer,
} from 'lucide-react';
import { apiGet, ApiResponse } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { utcToCenterDateInput } from '@/lib/tz';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface SheetDate {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
}

interface SheetStudent {
  studentId: string;
  name: string;
  studentCode?: string | null;
  records: Record<string, string>;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  ratePercent: number;
}

interface SheetResponseData {
  batch: {
    id: string;
    name: string;
  };
  month: string;
  dates: SheetDate[];
  students: SheetStudent[];
}

interface BatchOption {
  id: string;
  name: string;
}

export default function AttendanceSheetPage() {
  const { center } = useCenter();
  const timezone = center.timezone || 'Asia/Dhaka';
  const currentMonth = React.useMemo(() => {
    const today = utcToCenterDateInput(new Date(), timezone);
    return today.slice(0, 7); // YYYY-MM
  }, [timezone]);

  // Controls
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth);

  // Sheet data state
  const [sheetData, setSheetData] = React.useState<SheetResponseData | null>(null);
  const [loadingBatches, setLoadingBatches] = React.useState<boolean>(true);
  const [loadingSheet, setLoadingSheet] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load batches on mount
  React.useEffect(() => {
    async function loadBatches() {
      setLoadingBatches(true);
      try {
        const res = await apiGet<ApiResponse<{ items: BatchOption[] }>>('/api/tables/batches?limit=100');
        if (res.success && res.data?.items) {
          const list = res.data.items;
          setBatches(list);
          if (list.length > 0) {
            setSelectedBatchId(list[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingBatches(false);
      }
    }
    loadBatches();
  }, []);

  // Refresh callback for retry
  const refreshSheet = React.useCallback(async (batchId: string, month: string) => {
    if (!batchId || !month) return;
    setLoadingSheet(true);
    try {
      const res = await apiGet<ApiResponse<SheetResponseData>>(
        `/api/batches/${batchId}/attendance/sheet?month=${month}`
      );
      if (res.success && res.data) {
        setSheetData(res.data);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || 'Failed to load attendance sheet');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading sheet');
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!selectedBatchId || !selectedMonth) return;

    async function load() {
      try {
        const res = await apiGet<ApiResponse<SheetResponseData>>(
          `/api/batches/${selectedBatchId}/attendance/sheet?month=${selectedMonth}`
        );
        if (!active) return;
        if (res.success && res.data) {
          setSheetData(res.data);
          setErrorMsg(null);
        } else {
          setErrorMsg(res.message || 'Failed to load attendance sheet');
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Error loading sheet');
      } finally {
        if (active) setLoadingSheet(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [selectedBatchId, selectedMonth]);

  const csvDownloadUrl = selectedBatchId && selectedMonth
    ? `/api/batches/${selectedBatchId}/attendance/sheet?month=${selectedMonth}&format=csv`
    : '#';

  const handlePrint = () => {
    window.print();
  };

  const dates = sheetData?.dates || [];
  const students = sheetData?.students || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls (Hidden in Print) */}
      <div className="print:hidden space-y-4">
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
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Monthly Attendance Matrix Sheet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive student-by-date attendance matrix with daily status flags and totals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loadingSheet || !sheetData || students.length === 0}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-4 w-4" />
              Print Sheet
            </Button>

            <a
              href={csvDownloadUrl}
              download={`attendance-${selectedMonth}.csv`}
              className={`inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover hover:border-border-hover transition-colors ${
                !sheetData || students.length === 0 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Download className="h-4 w-4 mr-1.5 text-muted-foreground" />
              Export CSV
            </a>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 shadow-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Select Batch
              </label>
              {loadingBatches ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Month Picker */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Select Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-foreground">
          {sheetData?.batch?.name || 'Batch'} · Attendance Sheet
        </h2>
        <p className="text-sm text-muted-foreground">
          Month: {selectedMonth} · Total Enrolled: {students.length}
        </p>
      </div>

      {/* Matrix Table */}
      {errorMsg ? (
        <ErrorState message={errorMsg} onRetry={() => refreshSheet(selectedBatchId, selectedMonth)} />
      ) : loadingSheet ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : !sheetData || students.length === 0 ? (
        <EmptyState
          title="No Attendance Data"
          description={`No classes or attendance records were found for this batch in ${selectedMonth}.`}
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header row */}
              <thead className="bg-muted/40 font-semibold text-foreground border-b border-border">
                <tr>
                  {/* Sticky Student Column */}
                  <th className="sticky left-0 z-20 bg-surface sm:bg-muted/40 px-3 py-3 font-bold border-r border-border min-w-[160px] shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                    Student
                  </th>

                  {/* Dates columns */}
                  {dates.map((d) => (
                    <th
                      key={d.date}
                      className={`px-2 py-2 text-center border-r border-border min-w-[36px] ${
                        d.isWeekend ? 'bg-muted/50 font-bold' : ''
                      }`}
                    >
                      <div className="text-[10px] text-muted-foreground">{d.dayOfWeek}</div>
                      <div className="text-xs">{d.date.slice(8)}</div>
                    </th>
                  ))}

                  {/* Summary Totals columns */}
                  <th className="px-2.5 py-3 text-center border-r border-border min-w-[40px] text-foreground">
                    Tot
                  </th>
                  <th className="px-2.5 py-3 text-center border-r border-border min-w-[40px] text-secondary">
                    Pres
                  </th>
                  <th className="px-2.5 py-3 text-center border-r border-border min-w-[40px] text-danger">
                    Abs
                  </th>
                  <th className="px-2.5 py-3 text-center border-r border-border min-w-[40px] text-warning">
                    Late
                  </th>
                  <th className="px-3 py-3 text-center min-w-[50px] font-bold text-foreground">
                    Rate
                  </th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-surface-hover transition-colors">
                    {/* Sticky Student Name */}
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2.5 border-r border-border font-medium text-foreground whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                      <div className="truncate max-w-[150px]">{student.name}</div>
                      {student.studentCode && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {student.studentCode}
                        </div>
                      )}
                    </td>

                    {/* Date status cells */}
                    {dates.map((d) => {
                      const status = student.records[d.date] || '-';
                      let cellClass = 'text-muted-foreground';
                      if (status === 'P') cellClass = 'text-secondary font-bold bg-secondary/10';
                      else if (status === 'A') cellClass = 'text-danger font-bold bg-danger/10';
                      else if (status === 'L') cellClass = 'text-warning font-bold bg-accent/15';
                      else if (status === 'E') cellClass = 'text-primary font-medium';

                      return (
                        <td
                          key={d.date}
                          className={`px-1 py-2 text-center border-r border-border text-xs ${cellClass} ${
                            d.isWeekend && status === '-' ? 'bg-muted/30' : ''
                          }`}
                        >
                          {status}
                        </td>
                      );
                    })}

                    {/* Summary columns */}
                    <td className="px-2.5 py-2.5 text-center border-r border-border font-medium text-foreground">
                      {student.totalClasses}
                    </td>
                    <td className="px-2.5 py-2.5 text-center border-r border-border font-semibold text-secondary">
                      {student.presentCount}
                    </td>
                    <td className="px-2.5 py-2.5 text-center border-r border-border font-semibold text-danger">
                      {student.absentCount}
                    </td>
                    <td className="px-2.5 py-2.5 text-center border-r border-border font-semibold text-warning">
                      {student.lateCount}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-foreground">
                      <span
                        className={
                          student.ratePercent >= 75
                            ? 'text-secondary'
                            : student.ratePercent >= 50
                            ? 'text-warning'
                            : 'text-danger'
                        }
                      >
                        {student.ratePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend Footer */}
          <div className="p-3.5 border-t border-border bg-muted/20 flex flex-wrap items-center gap-4 text-xs text-muted-foreground print:text-[10px]">
            <span className="font-semibold text-foreground">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 rounded text-center leading-4 font-bold bg-secondary/15 text-secondary">P</span>
              Present
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 rounded text-center leading-4 font-bold bg-danger/15 text-danger">A</span>
              Absent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 rounded text-center leading-4 font-bold bg-accent/20 text-warning">L</span>
              Late
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 rounded text-center leading-4 font-medium text-muted-foreground">-</span>
              No Class / Not Enrolled
            </span>
            <span className="ml-auto text-muted-foreground italic">
              Weekend columns shaded
            </span>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            font-size: 9px !important;
          }
          th, td {
            padding: 2px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
