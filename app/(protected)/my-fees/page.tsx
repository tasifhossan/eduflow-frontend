'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wallet,
  Printer,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, StatusVariant } from '@/components/dashboard/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

function getFeeStatusVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'partial') return 'partial';
  if (s === 'overdue') return 'overdue';
  if (s === 'waived') return 'waived';
  if (s === 'void') return 'void';
  return 'due';
}

interface LinkedChild {
  id: string;
  name: string;
  studentCode: string | null;
  phone?: string | null;
}

interface ChargeItem {
  id: string;
  batchName: string;
  kind: string;
  period: string | null;
  description: string;
  dueDate: string;
  originalAmount: string;
  effectiveAmount: string;
  paidAmount: string;
  balance: string;
  status: 'DUE' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'VOID' | 'WAIVED';
}

interface PaymentItem {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference: string | null;
  isReversed: boolean;
  allocations: Array<{
    chargeId: string;
    chargeDescription: string;
    amount: string;
  }>;
}

interface StatementData {
  student: {
    id: string;
    name: string;
    studentCode: string | null;
    phone: string | null;
  };
  creditBalance: string;
  studentCredit: string;
  totals: {
    totalOutstanding: string;
    totalPaid: string;
    totalEffective: string;
    studentCredit: string;
  };
  charges: ChargeItem[];
  payments: PaymentItem[];
}

export default function MyFeesPage() {
  const { center } = useCenter();
  const { user } = useAuth();

  const isGuardian = user?.role === 'GUARDIAN';

  // Guardian children state
  const [children, setChildren] = React.useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');
  const [isLoadingChildren, setIsLoadingChildren] = React.useState(false);

  // Statement data state
  const [statement, setStatement] = React.useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  // Active tab
  const [activeTab, setActiveTab] = React.useState<'charges' | 'payments'>('charges');

  const refetchStatement = React.useCallback(() => {
    setIsLoading(true);
    setReloadTrigger((c) => c + 1);
  }, []);

  // Load guardian's linked students
  React.useEffect(() => {
    if (!isGuardian) return;

    async function loadChildren() {
      setIsLoadingChildren(true);
      try {
        const res = await apiGet<{ success: boolean; data: LinkedChild[] }>('/api/guardians/my-students');
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setChildren(res.data);
          setSelectedChildId(res.data[0].id);
        }
      } catch {
        setError('Failed to load linked students.');
      } finally {
        setIsLoadingChildren(false);
      }
    }
    loadChildren();
  }, [isGuardian]);

  // Fetch statement
  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        let endpoint = '/api/fees/my-account';
        if (isGuardian) {
          if (!selectedChildId) {
            if (!ignore) setIsLoading(false);
            return;
          }
          endpoint = `/api/fees/guardian/students/${selectedChildId}/account`;
        }

        const res = await apiGet<{ success: boolean; data: StatementData }>(endpoint);
        if (!ignore) {
          if (res?.success && res.data) {
            setStatement(res.data);
            setError(null);
          } else {
            setError('Unable to load fee ledger statement.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Network error: Unable to load fee information.');
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
  }, [isGuardian, selectedChildId, reloadTrigger]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Fees & Ledger"
          description="Official billing statement, receipt records, and account balances"
        />

        {/* Guardian Child Selector */}
        {isGuardian && children.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="child-select" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Select Child:
            </label>
            <select
              id="child-select"
              disabled={isLoadingChildren}
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="flex h-9 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} {child.studentCode ? `(${child.studentCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          </div>
          <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
        </div>
      ) : error ? (
        <ErrorState
          title="Statement Unavailable"
          message={error}
          onRetry={refetchStatement}
        />
      ) : !statement ? (
        <EmptyState
          title="No fee statement"
          description="You do not have any registered fee records at this time."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Dues
              </div>
              <div className="mt-2 text-2xl font-bold text-status-danger-text">
                {formatMoney(statement.totals.totalOutstanding, center.currency, center.currencySymbol)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Pending payments</div>
            </div>

            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-status-success-text" />
                Available Credit Balance
              </div>
              <div className="mt-2 text-2xl font-bold text-status-success-text">
                {formatMoney(statement.studentCredit, center.currency, center.currencySymbol)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Pre-paid balance</div>
            </div>

            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Lifetime Paid
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {formatMoney(statement.totals.totalPaid, center.currency, center.currencySymbol)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Confirmed payments</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('charges')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'charges'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Charges & Dues ({statement.charges.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'payments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Payment History & Receipts ({statement.payments.length})
              </button>
            </nav>
          </div>

          {/* Tab 1: Charges List */}
          {activeTab === 'charges' && (
            <Card>
              <CardContent className="p-0">
                {statement.charges.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="No charges on record"
                      description="You currently have no fee charges billed to your account."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Batch</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">Paid</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {statement.charges.map((ch) => (
                          <tr key={ch.id} className="hover:bg-surface-hover/50 transition">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{ch.description}</div>
                              {ch.period && <div className="text-xs text-muted-foreground">Period: {ch.period}</div>}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{ch.batchName}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(ch.dueDate, center.timezone)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                              {formatMoney(ch.effectiveAmount, center.currency, center.currencySymbol)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-status-success-text">
                              {formatMoney(ch.paidAmount, center.currency, center.currencySymbol)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                              {formatMoney(ch.balance, center.currency, center.currencySymbol)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge variant={getFeeStatusVariant(ch.status)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Payments List */}
          {activeTab === 'payments' && (
            <Card>
              <CardContent className="p-0">
                {statement.payments.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="No payment history"
                      description="No payments have been recorded for your account yet."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="px-4 py-3">Receipt #</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {statement.payments.map((p) => (
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
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(p.receivedAt, center.timezone)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                              <span className={p.isReversed ? 'line-through text-status-danger-text' : ''}>
                                {formatMoney(p.amount, center.currency, center.currencySymbol)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{p.method}</td>
                            <td className="px-4 py-3 text-center">
                              {p.isReversed ? (
                                <StatusBadge variant="reversed" />
                              ) : (
                                <StatusBadge variant="paid" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/fees/receipts/${p.id}`}
                                className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Receipt
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
