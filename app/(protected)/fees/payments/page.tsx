'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Download,
  RotateCw,
  Printer,
  CreditCard,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface PaymentRow {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference: string | null;
  note: string | null;
  studentId?: string;
  studentName?: string;
  studentCode?: string | null;
  student?: {
    id: string;
    name: string;
    studentCode: string | null;
  } | null;
  receivedByName?: string;
  receivedBy?: {
    id?: string;
    name: string;
  } | null;
  isReversed: boolean;
  reversalReason?: string | null;
  reversal?: {
    reason: string;
    reversedAt?: string;
  } | null;
  allocationsCount?: number;
}

interface PaymentsResponse {
  summary?: {
    totalCount: number;
    totalAmount: string;
  };
  items: PaymentRow[];
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

const PAYMENT_METHODS = [
  { value: '', label: 'All Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'ROCKET', label: 'Rocket' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export default function PaymentsLedgerPage() {
  const { center } = useCenter();

  // Filters
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [method, setMethod] = React.useState('');
  const [batchId, setBatchId] = React.useState('');
  const [includeReversed, setIncludeReversed] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  // Data
  const [data, setData] = React.useState<PaymentsResponse | null>(null);
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetchPayments = React.useCallback(() => {
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

  // Fetch payments
  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: '20',
          includeReversed: String(includeReversed),
        });
        if (startDate) q.set('startDate', startDate);
        if (endDate) q.set('endDate', endDate);
        if (method) q.set('method', method);
        if (batchId) q.set('batchId', batchId);

        const res = await apiGet<{ success: boolean; data: PaymentsResponse }>(
          `/api/fees/payments?${q.toString()}`
        );
        if (!ignore) {
          if (res?.success && res.data) {
            setData(res.data);
            setError(null);
          } else {
            setError('Failed to load payments ledger.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Network error: Unable to load payment records.');
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
  }, [page, startDate, endDate, method, batchId, includeReversed, reloadTrigger]);

  const handleExportCsv = () => {
    const q = new URLSearchParams({
      format: 'csv',
      includeReversed: String(includeReversed),
    });
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (method) q.set('method', method);
    if (batchId) q.set('batchId', batchId);
    window.open(`/api/fees/payments?${q.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Payments Ledger"
          description="Audit-logged immutable transaction history with race-free receipt numbers and reversal records"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!data || data.items.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Link
            href="/fees/collect"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
          >
            <CreditCard className="h-4 w-4" />
            Collect Payment
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="filter-start" className="text-xs font-semibold text-muted-foreground">
                From Date
              </label>
              <input
                id="filter-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-end" className="text-xs font-semibold text-muted-foreground">
                To Date
              </label>
              <input
                id="filter-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-method" className="text-xs font-semibold text-muted-foreground">
                Payment Method
              </label>
              <select
                id="filter-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-batch" className="text-xs font-semibold text-muted-foreground">
                Batch
              </label>
              <select
                id="filter-batch"
                value={batchId}
                onChange={(e) => {
                  setBatchId(e.target.value);
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
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              id="include-reversed"
              type="checkbox"
              checked={includeReversed}
              onChange={(e) => {
                setIncludeReversed(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <label htmlFor="include-reversed" className="text-xs font-medium text-foreground cursor-pointer">
              Show reversed transactions
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RotateCw className="h-5 w-5 animate-spin text-primary" />
              Loading payments ledger...
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState title="Error Loading Ledger" message={error} onRetry={refetchPayments} />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No payments recorded"
                description="No payment records found matching the selected filter criteria."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Receipt #</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Received By</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((p) => {
                      const studentId = p.student?.id || p.studentId || '';
                      const studentName = p.student?.name || p.studentName || 'Student';
                      const studentCode = p.student?.studentCode ?? p.studentCode;
                      const receivedByName = p.receivedBy?.name || p.receivedByName || 'Staff';
                      const reversalReason = p.reversal?.reason || p.reversalReason;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-surface-hover/50 transition ${
                            p.isReversed ? 'opacity-60 bg-muted/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/fees/receipts/${p.id}`}
                              className={`font-mono text-xs font-bold text-primary hover:underline ${
                                p.isReversed ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {p.receiptNumber}
                            </Link>
                            {p.reference && (
                              <div className="text-xs text-muted-foreground">Ref: {p.reference}</div>
                            )}
                            {reversalReason && (
                              <div className="text-xs text-status-danger-text italic mt-0.5">
                                Reversed: {reversalReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {studentId ? (
                              <Link
                                href={`/fees/students/${studentId}`}
                                className="font-semibold text-foreground hover:text-primary transition"
                              >
                                {studentName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-foreground">{studentName}</span>
                            )}
                            {studentCode && (
                              <div className="text-xs font-mono text-muted-foreground">
                                {studentCode}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                            <span className={p.isReversed ? 'line-through text-status-danger-text' : ''}>
                              {formatMoney(p.amount, center.currency, center.currencySymbol)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground font-medium">{p.method}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {receivedByName}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(p.receivedAt, center.timezone)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.isReversed ? (
                              <StatusBadge variant="reversed" />
                            ) : (
                              <StatusBadge variant="paid" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/fees/receipts/${p.id}`}
                                className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Receipt
                              </Link>
                              {studentId && (
                                <Link
                                  href={`/fees/students/${studentId}`}
                                  className="rounded-[var(--radius-control)] border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                                >
                                  Ledger
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-border">
                  <Pagination
                    currentPage={page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
