'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  PlusCircle,
  RotateCcw,
  Split,
  Printer,
  RotateCw,
  Wallet,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { formatMoney, formatDate } from '@/lib/format';
import {
  toMinor,
  fromMinor,
  isPositive,
  isZero,
} from '@/lib/money';
import { MoneyInput } from '@/components/ui/money-input';
import { StatusBadge, StatusVariant } from '@/components/dashboard/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

function getFeeStatusVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'partial') return 'partial';
  if (s === 'overdue') return 'overdue';
  if (s === 'waived') return 'waived';
  if (s === 'void') return 'void';
  return 'due';
}

interface AdjustmentItem {
  id: string;
  type: 'DISCOUNT' | 'PENALTY' | 'WAIVER';
  amount: string;
  reason: string;
  status: 'ACTIVE' | 'VOID';
  createdAt: string;
}

interface ChargeItem {
  id: string;
  batchId: string;
  batchName: string;
  kind: string;
  period: string | null;
  description: string;
  dueDate: string;
  originalAmount: string;
  totalAdjustments: string;
  effectiveAmount: string;
  paidAmount: string;
  balance: string;
  status: 'DUE' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'VOID' | 'WAIVED';
  voidReason?: string | null;
  createdAt: string;
  adjustments: AdjustmentItem[];
}

interface PaymentItem {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference: string | null;
  note: string | null;
  receivedById: string;
  receivedByName: string;
  isReversed: boolean;
  reversal: {
    reason: string;
    reversedAt: string;
  } | null;
  allocations: Array<{
    chargeId: string;
    chargeDescription: string;
    period: string | null;
    amount: string;
  }>;
  unallocatedAmount: string;
}

interface StudentAccountStatement {
  student: {
    id: string;
    name: string;
    studentCode: string | null;
    phone: string | null;
    branchId: string;
    branchName: string;
  };
  creditBalance: string;
  studentCredit: string;
  totals: {
    totalCharges: string;
    totalEffective: string;
    totalPaid: string;
    totalOutstanding: string;
    studentCredit: string;
  };
  charges: ChargeItem[];
  payments: PaymentItem[];
}

interface BatchOption {
  id: string;
  name: string;
}

export default function StudentLedgerPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { center } = useCenter();
  const { user } = useAuth();

  // Resolve params
  const unwrappedParams = 'then' in params ? React.use(params) : params;
  const studentId = unwrappedParams.id;

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ACCOUNTANT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // State
  const [statement, setStatement] = React.useState<StudentAccountStatement | null>(null);
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'charges' | 'payments' | 'adjustments'>('charges');
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  // Modals state
  const [activeModal, setActiveModal] = React.useState<
    'add-charge' | 'installments' | 'adjust-charge' | 'void-charge' | 'reverse-payment' | 'void-adjustment' | null
  >(null);
  const [selectedCharge, setSelectedCharge] = React.useState<ChargeItem | null>(null);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentItem | null>(null);
  const [selectedAdjustment, setSelectedAdjustment] = React.useState<AdjustmentItem | null>(null);

  // Form states inside modals
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = React.useState(false);

  // Add Charge Form
  const [newChargeBatchId, setNewChargeBatchId] = React.useState('');
  const [newChargeAmount, setNewChargeAmount] = React.useState('');
  const [newChargeDueDate, setNewChargeDueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [newChargeDesc, setNewChargeDesc] = React.useState('');
  const [newChargeKind, setNewChargeKind] = React.useState('TUITION');
  const [newChargePeriod, setNewChargePeriod] = React.useState('');

  // Installment Plan Form
  const [instBatchId, setInstBatchId] = React.useState('');
  const [instTotal, setInstTotal] = React.useState('');
  const [instCount, setInstCount] = React.useState('3');
  const [instFirstDueDate, setInstFirstDueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [instInterval, setInstInterval] = React.useState('1');
  const [instDesc, setInstDesc] = React.useState('Tuition Installment');

  // Adjust Charge Form
  const [adjType, setAdjType] = React.useState<'DISCOUNT' | 'PENALTY' | 'WAIVER'>('DISCOUNT');
  const [adjAmount, setAdjAmount] = React.useState('');
  const [adjReason, setAdjReason] = React.useState('');

  // Void Reason Form
  const [voidReason, setVoidReason] = React.useState('');

  // Reverse Payment Form
  const [reverseReason, setReverseReason] = React.useState('');

  const refetchStatement = React.useCallback(() => {
    setIsLoading(true);
    setReloadTrigger((c) => c + 1);
  }, []);

  React.useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const res = await apiGet<{ success: boolean; data: StudentAccountStatement }>(
          `/api/fees/students/${studentId}/account`
        );
        if (!ignore) {
          if (res?.success && res.data) {
            setStatement(res.data);
            setError(null);
          } else {
            setError('Failed to load student fee ledger statement.');
          }
        }
      } catch {
        if (!ignore) {
          setError('Network error: Unable to connect to backend server.');
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
  }, [studentId, reloadTrigger]);

  React.useEffect(() => {
    async function loadBatches() {
      try {
        const res = await apiGet<{ success: boolean; data: BatchOption[] }>('/api/batches');
        if (res?.success && Array.isArray(res.data)) {
          setBatches(res.data);
          if (res.data[0]) {
            setNewChargeBatchId(res.data[0].id);
            setInstBatchId(res.data[0].id);
          }
        }
      } catch {
        // Ignore batch error
      }
    }
    loadBatches();
  }, []);

  // Derived: All adjustments across all charges
  const allAdjustments = React.useMemo(() => {
    if (!statement?.charges) return [];
    const list: Array<AdjustmentItem & { chargeDescription: string; chargeId: string }> = [];
    for (const ch of statement.charges) {
      for (const adj of ch.adjustments) {
        list.push({
          ...adj,
          chargeDescription: ch.description,
          chargeId: ch.id,
        });
      }
    }
    return list;
  }, [statement]);

  // Installment Plan Preview calculation using BigInt minor units
  const installmentPreview = React.useMemo(() => {
    if (!isPositive(instTotal)) return [];
    const count = parseInt(instCount, 10);
    if (isNaN(count) || count < 2 || count > 12) return [];

    const totalMinor = toMinor(instTotal);
    const baseInstallmentMinor = totalMinor / BigInt(count);
    const remainderMinor = totalMinor % BigInt(count);

    const interval = parseInt(instInterval, 10) || 1;
    const baseDate = new Date(instFirstDueDate);

    const items: Array<{ num: number; amount: string; dueDate: string }> = [];

    for (let i = 0; i < count; i++) {
      // Remainder poisha/cents added to first installment so sum matches total exactly
      const amountMinor = i === 0 ? baseInstallmentMinor + remainderMinor : baseInstallmentMinor;
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i * interval);
      items.push({
        num: i + 1,
        amount: fromMinor(amountMinor),
        dueDate: d.toISOString().slice(0, 10),
      });
    }

    return items;
  }, [instTotal, instCount, instInterval, instFirstDueDate]);

  // Handlers for Staff Actions
  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChargeBatchId || !isPositive(newChargeAmount) || !newChargeDesc.trim()) {
      setModalError('Please fill in all required fields.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost('/api/fees/charges', {
        studentId,
        batchId: newChargeBatchId,
        amount: newChargeAmount,
        dueDate: newChargeDueDate,
        description: newChargeDesc.trim(),
        kind: newChargeKind,
        period: newChargePeriod.trim() || null,
      });
      if (res?.success) {
        setActiveModal(null);
        setNewChargeAmount('');
        setNewChargeDesc('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to create charge.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error creating charge.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleCreateInstallments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instBatchId || !isPositive(instTotal)) {
      setModalError('Please specify batch and valid total amount.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost('/api/fees/charges/installments', {
        studentId,
        batchId: instBatchId,
        total: instTotal,
        count: parseInt(instCount, 10),
        firstDueDate: instFirstDueDate,
        intervalMonths: parseInt(instInterval, 10),
        description: instDesc.trim() || undefined,
      });
      if (res?.success) {
        setActiveModal(null);
        setInstTotal('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to generate installment plan.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error generating installments.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharge || !isPositive(adjAmount) || !adjReason.trim()) {
      setModalError('Please provide adjustment amount and justification reason.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost('/api/fees/adjustments', {
        chargeId: selectedCharge.id,
        type: adjType,
        amount: adjAmount,
        reason: adjReason.trim(),
      });
      if (res?.success) {
        setActiveModal(null);
        setAdjAmount('');
        setAdjReason('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to apply adjustment.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error applying adjustment.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleVoidCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharge || !voidReason.trim()) {
      setModalError('Void reason is mandatory.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost(`/api/fees/charges/${selectedCharge.id}/void`, {
        reason: voidReason.trim(),
      });
      if (res?.success) {
        setActiveModal(null);
        setVoidReason('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to void charge.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error voiding charge.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleReversePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !reverseReason.trim()) {
      setModalError('Reversal reason is mandatory.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost(`/api/fees/payments/${selectedPayment.id}/reverse`, {
        reason: reverseReason.trim(),
      });
      if (res?.success) {
        setActiveModal(null);
        setReverseReason('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to reverse payment.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error reversing payment.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleVoidAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment || !voidReason.trim()) {
      setModalError('Void reason is mandatory.');
      return;
    }

    setIsSubmittingModal(true);
    setModalError(null);
    try {
      const res = await apiPost(`/api/fees/adjustments/${selectedAdjustment.id}/void`, {
        reason: voidReason.trim(),
      });
      if (res?.success) {
        setActiveModal(null);
        setVoidReason('');
        refetchStatement();
      } else {
        setModalError(res?.message || 'Failed to void adjustment.');
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error voiding adjustment.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Student Fee Account" description="Loading statement..." />
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <RotateCw className="h-5 w-5 animate-spin text-primary" />
            Loading student ledger account statement...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="space-y-6">
        <PageHeader title="Student Fee Account" />
        <ErrorState
          title="Account Statement Unavailable"
          message={error || 'Could not find the requested student account.'}
          onRetry={refetchStatement}
        />
      </div>
    );
  }

  const { student, totals, charges, payments } = statement;

  return (
    <div className="space-y-6">
      {/* Back button & Page Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/fees/dues"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dues
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{student.name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.studentCode ? `Code: ${student.studentCode} • ` : ''}
            {student.phone ? `Phone: ${student.phone} • ` : ''}
            Branch: {student.branchName}
          </p>
        </div>

        {isStaff && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/fees/collect"
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
            >
              <CreditCard className="h-4 w-4" />
              Collect Payment
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal('add-charge');
                setModalError(null);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Add Charge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal('installments');
                setModalError(null);
              }}
            >
              <Split className="h-4 w-4 mr-1.5" />
              Installment Plan
            </Button>
          </div>
        )}
      </div>

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Outstanding Dues
          </div>
          <div className="mt-2 text-2xl font-bold text-status-danger-text">
            {formatMoney(totals.totalOutstanding, center.currency, center.currencySymbol)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pending payments</div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-status-success-text" />
            Credit Balance
          </div>
          <div className="mt-2 text-2xl font-bold text-status-success-text">
            {formatMoney(totals.studentCredit, center.currency, center.currencySymbol)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Auto-applied to new charges</div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Paid
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatMoney(totals.totalPaid, center.currency, center.currencySymbol)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Net collected</div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Effective Charges
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatMoney(totals.totalEffective, center.currency, center.currencySymbol)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Net of waivers & discounts</div>
        </div>
      </div>

      {/* Ledger Navigation Tabs */}
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
            Charges ({charges.length})
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
            Payments ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjustments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'adjustments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Adjustments ({allAdjustments.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Charges Table */}
      {activeTab === 'charges' && (
        <Card>
          <CardContent className="p-0">
            {charges.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No charges on record"
                  description="This student has no billed charges in the ledger."
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
                      <th className="px-4 py-3 text-right">Adjusted</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {charges.map((c) => {
                      const isUnpaid = isZero(c.paidAmount) && c.status !== 'VOID';
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-surface-hover/50 transition ${
                            c.status === 'VOID' ? 'opacity-60 bg-muted/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{c.description}</div>
                            {c.period && <div className="text-xs text-muted-foreground">Period: {c.period}</div>}
                            {c.voidReason && (
                              <div className="text-xs text-status-danger-text italic">
                                Voided: {c.voidReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.batchName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(c.dueDate, center.timezone)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {formatMoney(c.originalAmount, center.currency, center.currencySymbol)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                            {formatMoney(c.totalAdjustments, center.currency, center.currencySymbol)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-status-success-text">
                            {formatMoney(c.paidAmount, center.currency, center.currencySymbol)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                            {formatMoney(c.balance, center.currency, center.currencySymbol)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge variant={getFeeStatusVariant(c.status)} />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              {c.status !== 'VOID' && c.status !== 'PAID' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 px-2"
                                    onClick={() => {
                                      setSelectedCharge(c);
                                      setActiveModal('adjust-charge');
                                      setModalError(null);
                                    }}
                                  >
                                    Adjust
                                  </Button>
                                  {isUnpaid && (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="text-xs h-8 px-2"
                                      onClick={() => {
                                        setSelectedCharge(c);
                                        setActiveModal('void-charge');
                                        setModalError(null);
                                      }}
                                    >
                                      Void
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Payments Table */}
      {activeTab === 'payments' && (
        <Card>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No payments recorded"
                  description="This student has no payment transactions in the ledger."
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
                      <th className="px-4 py-3">Received By</th>
                      <th className="px-4 py-3">Allocations</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
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
                          {p.reversal && (
                            <div className="text-xs text-status-danger-text italic mt-0.5">
                              Reversed: {p.reversal.reason}
                            </div>
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
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.receivedByName}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.allocations.length} charge(s)
                          {isPositive(p.unallocatedAmount) && (
                            <span className="block text-status-success-text">
                              + {formatMoney(p.unallocatedAmount, center.currency, center.currencySymbol)} credit
                            </span>
                          )}
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
                            {isAdmin && !p.isReversed && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="text-xs h-8 px-2"
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setActiveModal('reverse-payment');
                                  setModalError(null);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Reverse
                              </Button>
                            )}
                          </div>
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

      {/* Tab 3: Adjustments Table */}
      {activeTab === 'adjustments' && (
        <Card>
          <CardContent className="p-0">
            {allAdjustments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No adjustments applied"
                  description="No discounts, waivers, or penalties have been recorded for this student."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Charge</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allAdjustments.map((adj) => (
                      <tr
                        key={adj.id}
                        className={`hover:bg-surface-hover/50 transition ${
                          adj.status === 'VOID' ? 'opacity-60 bg-muted/20 line-through' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-xs text-foreground">
                          {adj.type}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {adj.chargeDescription}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-foreground">
                          {formatMoney(adj.amount, center.currency, center.currencySymbol)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{adj.reason}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(adj.createdAt, center.timezone)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {adj.status === 'VOID' ? (
                            <StatusBadge variant="void" />
                          ) : (
                            <StatusBadge variant="completed" label="Active" />
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {adj.status === 'ACTIVE' && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="text-xs h-8 px-2"
                                onClick={() => {
                                  setSelectedAdjustment(adj);
                                  setActiveModal('void-adjustment');
                                  setModalError(null);
                                }}
                              >
                                Void
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: Add Manual Charge */}
      {activeModal === 'add-charge' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Add One-Time Charge"
        >
          <form onSubmit={handleCreateCharge} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="charge-batch" className="text-sm font-semibold text-foreground">
                Batch <span className="text-status-danger-text">*</span>
              </label>
              <select
                id="charge-batch"
                value={newChargeBatchId}
                onChange={(e) => setNewChargeBatchId(e.target.value)}
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="charge-amount" className="text-sm font-semibold text-foreground">
                  Amount <span className="text-status-danger-text">*</span>
                </label>
                <MoneyInput
                  id="charge-amount"
                  value={newChargeAmount}
                  onChange={setNewChargeAmount}
                  placeholder="0.00"
                  currencySymbol={center.currencySymbol}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="charge-due" className="text-sm font-semibold text-foreground">
                  Due Date <span className="text-status-danger-text">*</span>
                </label>
                <input
                  id="charge-due"
                  type="date"
                  value={newChargeDueDate}
                  onChange={(e) => setNewChargeDueDate(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="charge-desc" className="text-sm font-semibold text-foreground">
                Description <span className="text-status-danger-text">*</span>
              </label>
              <input
                id="charge-desc"
                type="text"
                value={newChargeDesc}
                onChange={(e) => setNewChargeDesc(e.target.value)}
                placeholder="e.g. Special exam fee, Admission materials, etc."
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="charge-kind" className="text-sm font-semibold text-foreground">
                  Fee Type
                </label>
                <select
                  id="charge-kind"
                  value={newChargeKind}
                  onChange={(e) => setNewChargeKind(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                >
                  <option value="TUITION">Tuition Fee</option>
                  <option value="ADMISSION">Admission Fee</option>
                  <option value="EXAM">Exam Fee</option>
                  <option value="MATERIAL">Materials / Books</option>
                  <option value="OTHER">Other Fee</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="charge-period" className="text-sm font-semibold text-foreground">
                  Billing Period (Optional)
                </label>
                <input
                  id="charge-period"
                  type="text"
                  value={newChargePeriod}
                  onChange={(e) => setNewChargePeriod(e.target.value)}
                  placeholder="e.g. 2026-11"
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                />
              </div>
            </div>

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingModal}>
                {isSubmittingModal ? 'Creating...' : 'Create Charge'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create Installment Plan */}
      {activeModal === 'installments' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Create Installment Plan"
        >
          <form onSubmit={handleCreateInstallments} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="inst-batch" className="text-sm font-semibold text-foreground">
                Batch <span className="text-status-danger-text">*</span>
              </label>
              <select
                id="inst-batch"
                value={instBatchId}
                onChange={(e) => setInstBatchId(e.target.value)}
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inst-desc" className="text-sm font-semibold text-foreground">
                Description
              </label>
              <input
                id="inst-desc"
                type="text"
                value={instDesc}
                onChange={(e) => setInstDesc(e.target.value)}
                placeholder="e.g. Tuition Installment"
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="inst-total" className="text-sm font-semibold text-foreground">
                  Total Amount <span className="text-status-danger-text">*</span>
                </label>
                <MoneyInput
                  id="inst-total"
                  value={instTotal}
                  onChange={setInstTotal}
                  placeholder="0.00"
                  currencySymbol={center.currencySymbol}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="inst-count" className="text-sm font-semibold text-foreground">
                  Number of Installments (2–12)
                </label>
                <input
                  id="inst-count"
                  type="number"
                  min="2"
                  max="12"
                  value={instCount}
                  onChange={(e) => setInstCount(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="inst-first-due" className="text-sm font-semibold text-foreground">
                  First Due Date
                </label>
                <input
                  id="inst-first-due"
                  type="date"
                  value={instFirstDueDate}
                  onChange={(e) => setInstFirstDueDate(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="inst-interval" className="text-sm font-semibold text-foreground">
                  Interval (Months)
                </label>
                <input
                  id="inst-interval"
                  type="number"
                  min="1"
                  max="12"
                  value={instInterval}
                  onChange={(e) => setInstInterval(e.target.value)}
                  className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                />
              </div>
            </div>

            {/* Exact Split Preview Table */}
            {installmentPreview.length > 0 && (
              <div className="rounded-[var(--radius-control)] border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Exact Split Preview (Integer Minor Units)
                </div>
                <div className="divide-y divide-border text-xs">
                  {installmentPreview.map((it) => (
                    <div key={it.num} className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Installment #{it.num} • Due {formatDate(it.dueDate, center.timezone)}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(it.amount, center.currency, center.currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingModal || installmentPreview.length === 0}>
                {isSubmittingModal ? 'Creating...' : `Create ${installmentPreview.length} Installments`}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Adjust Charge (Discount / Waiver / Penalty) */}
      {activeModal === 'adjust-charge' && selectedCharge && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Adjust Charge: ${selectedCharge.description}`}
        >
          <form onSubmit={handleCreateAdjustment} className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-[var(--radius-control)] border border-border">
              Original Amount: <span className="font-semibold text-foreground">{formatMoney(selectedCharge.originalAmount, center.currency, center.currencySymbol)}</span> •
              Current Balance: <span className="font-semibold text-foreground">{formatMoney(selectedCharge.balance, center.currency, center.currencySymbol)}</span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adj-type" className="text-sm font-semibold text-foreground">
                Adjustment Type <span className="text-status-danger-text">*</span>
              </label>
              <select
                id="adj-type"
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as 'DISCOUNT' | 'PENALTY' | 'WAIVER')}
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
              >
                <option value="DISCOUNT">Discount (Merit / Financial Assistance)</option>
                <option value="WAIVER">Waiver (Full / Partial Special Waiver)</option>
                <option value="PENALTY">Late Fee / Penalty</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adj-amount" className="text-sm font-semibold text-foreground">
                Adjustment Amount <span className="text-status-danger-text">*</span>
              </label>
              <MoneyInput
                id="adj-amount"
                value={adjAmount}
                onChange={setAdjAmount}
                placeholder="0.00"
                currencySymbol={center.currencySymbol}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adj-reason" className="text-sm font-semibold text-foreground">
                Justification Reason <span className="text-status-danger-text">*</span>
              </label>
              <input
                id="adj-reason"
                type="text"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g. Approved merit scholarship for term 2"
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              />
            </div>

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingModal}>
                {isSubmittingModal ? 'Applying...' : 'Apply Adjustment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Void Charge Confirmation */}
      {activeModal === 'void-charge' && selectedCharge && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Void Charge"
        >
          <form onSubmit={handleVoidCharge} className="space-y-4 py-2">
            <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
              <p className="font-bold">Permanent Void Action</p>
              <p className="mt-1">
                Voiding this charge will permanently cancel it from the ledger. This action cannot be reversed
                and will be recorded in the audit log.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="void-charge-reason" className="text-sm font-semibold text-foreground">
                Reason for Voiding <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                id="void-charge-reason"
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate charge created in error"
                className="flex w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              />
            </div>

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={isSubmittingModal || !voidReason.trim()}>
                {isSubmittingModal ? 'Voiding...' : 'Confirm Void Charge'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 5: Reverse Payment Confirmation */}
      {activeModal === 'reverse-payment' && selectedPayment && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Reverse Payment: ${selectedPayment.receiptNumber}`}
        >
          <form onSubmit={handleReversePayment} className="space-y-4 py-2">
            <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
              <p className="font-bold">Payment Reversal Consequences</p>
              <p className="mt-1">
                Reversing this payment of {formatMoney(selectedPayment.amount, center.currency, center.currencySymbol)}{' '}
                will immediately mark its receipt as reversed, restore charge balances for all allocated charges,
                and deduct any excess credit from the student&apos;s balance.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reverse-reason" className="text-sm font-semibold text-foreground">
                Reversal Reason <span className="text-status-danger-text">*</span>
              </label>
              <textarea
                id="reverse-reason"
                rows={3}
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Bank cheque returned unpaid / disputed transaction"
                className="flex w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              />
            </div>

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={isSubmittingModal || !reverseReason.trim()}>
                {isSubmittingModal ? 'Reversing...' : 'Confirm Reversal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 6: Void Adjustment Confirmation */}
      {activeModal === 'void-adjustment' && selectedAdjustment && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Void Adjustment"
        >
          <form onSubmit={handleVoidAdjustment} className="space-y-4 py-2">
            <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
              <p className="font-bold">Void Adjustment</p>
              <p className="mt-1">
                Cancels this {selectedAdjustment.type} of {formatMoney(selectedAdjustment.amount, center.currency, center.currencySymbol)} and restores the charge balance.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="void-adj-reason" className="text-sm font-semibold text-foreground">
                Void Reason <span className="text-status-danger-text">*</span>
              </label>
              <input
                id="void-adj-reason"
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Scholarship revoked / entered in error"
                className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                required
              />
            </div>

            {modalError && (
              <div className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-xs text-status-danger-text">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={isSubmittingModal || !voidReason.trim()}>
                {isSubmittingModal ? 'Voiding...' : 'Confirm Void'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
