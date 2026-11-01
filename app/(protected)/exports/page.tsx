'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  ShieldAlert,
  Loader2,
  Users,
  Award,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BatchOption {
  id: string;
  name: string;
}

interface PeriodOption {
  id: string;
  label: string;
}

export default function ExportsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Batch results export state
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [periods, setPeriods] = React.useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>('');

  // Status filter for students export
  const [studentStatus, setStudentStatus] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Loaders
  const [loadingBatches, setLoadingBatches] = React.useState(false);
  const [loadingPeriods, setLoadingPeriods] = React.useState(false);
  const [exportingStudents, setExportingStudents] = React.useState(false);
  const [exportingResults, setExportingResults] = React.useState(false);

  // Check role authorization
  React.useEffect(() => {
    if (user && !isStaff) {
      toast.error('Access restricted to Admin or Super Admin.');
      router.push('/dashboard');
    }
  }, [user, isStaff, router]);

  // Load batches for batch results export
  React.useEffect(() => {
    if (!isStaff) return;

    async function loadBatches() {
      setLoadingBatches(true);
      try {
        const res = await apiGet<{ success: boolean; data: BatchOption[] }>('/api/batches');
        if (res?.success && Array.isArray(res.data)) {
          setBatches(res.data);
          if (res.data.length > 0) {
            setSelectedBatchId(res.data[0].id);
          }
        }
      } catch {
        toast.error('Failed to load batches');
      } finally {
        setLoadingBatches(false);
      }
    }

    loadBatches();
  }, [isStaff]);

  // Load periods when selectedBatchId changes
  React.useEffect(() => {
    if (!selectedBatchId) {
      setPeriods([]);
      setSelectedPeriodId('');
      return;
    }

    async function loadPeriods() {
      setLoadingPeriods(true);
      try {
        const res = await apiGet<{ success: boolean; data: PeriodOption[] }>(
          `/api/batches/${selectedBatchId}/report-periods`
        );
        if (res?.success && Array.isArray(res.data)) {
          setPeriods(res.data);
        } else {
          setPeriods([]);
        }
      } catch {
        setPeriods([]);
      } finally {
        setLoadingPeriods(false);
      }
    }

    loadPeriods();
  }, [selectedBatchId]);

  // Trigger download helper
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Export Students CSV
  const handleExportStudents = async () => {
    setExportingStudents(true);
    try {
      const url = `/api/exports/students?format=csv&status=${studentStatus}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Export failed');
      }

      const blob = await res.blob();
      const filename = `students-${studentStatus.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, filename);
      toast.success('Students directory exported successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to export students');
    } finally {
      setExportingStudents(false);
    }
  };

  // Export Batch Results CSV
  const handleExportBatchResults = async () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch first');
      return;
    }

    setExportingResults(true);
    try {
      let url = `/api/exports/batch-results?batchId=${selectedBatchId}&format=csv`;
      if (selectedPeriodId) {
        url += `&periodId=${selectedPeriodId}`;
      }

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Export failed');
      }

      const blob = await res.blob();
      const filename = `batch-results-${selectedBatchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, filename);
      toast.success('Batch exam results exported successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to export batch results');
    } finally {
      setExportingResults(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-16">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Access restricted to administrators.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="Data Exports"
        description="Download branch-scoped directories and academic result spreadsheets in sanitized CSV format."
      />

      {/* PII Compliance Notice */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            PII & Compliance Notice
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Exported spreadsheets contain sensitive personally identifiable information (student phone numbers, guardian contacts, and individual test marks). All export actions are recorded in the immutable audit log with your user identity and IP address. Store and handle these files securely in compliance with coaching center data governance policies.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Students Directory Export */}
        <Card className="bg-surface border-border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Students Directory
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Full student contact roster including student code, phone, guardian name & phone, active batch enrollments, and registration date.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                Filter by Status
              </label>
              <div className="flex gap-2">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStudentStatus(status)}
                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      studentStatus === status
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface text-foreground border-border hover:bg-surface-hover'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-background p-3 text-[11px] text-muted-foreground space-y-1 border border-border">
              <div className="flex items-center justify-between">
                <span>Row Limit:</span>
                <span className="font-semibold text-foreground">5,000 students</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Format:</span>
                <span className="font-semibold text-foreground">CSV (UTF-8 with BOM)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formula Defense:</span>
                <span className="font-semibold text-foreground">Neutralized</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportStudents}
              disabled={exportingStudents}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {exportingStudents ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Students CSV
            </button>
          </CardContent>
        </Card>

        {/* Batch Results Export */}
        <Card className="bg-surface border-border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Batch Exam Results
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Detailed assessment marks per student across all closed exams, including obtained marks, maximum marks, percentage, and ranks.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Target Batch
              </label>
              {loadingBatches ? (
                <div className="h-9 w-full bg-background rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Report Period (Optional)
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={loadingPeriods || periods.length === 0}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">All Periods / Date Range</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-background p-3 text-[11px] text-muted-foreground space-y-1 border border-border">
              <div className="flex items-center justify-between">
                <span>Row Limit:</span>
                <span className="font-semibold text-foreground">5,000 test attempts</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Filter:</span>
                <span className="font-semibold text-foreground">Closed tests only</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formula Defense:</span>
                <span className="font-semibold text-foreground">Neutralized</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportBatchResults}
              disabled={exportingResults || !selectedBatchId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {exportingResults ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Batch Results CSV
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

