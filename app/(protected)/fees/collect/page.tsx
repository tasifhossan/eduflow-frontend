'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Printer,
  PlusCircle,
  FileText,
  User,
  CreditCard,
  AlertTriangle,
  RotateCw,
  Wallet,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney, formatDate } from '@/lib/format';
import {
  subtract,
  compare,
  sum,
  isPositive,
} from '@/lib/money';
import { MoneyInput } from '@/components/ui/money-input';
import { StatusBadge, StatusVariant } from '@/components/dashboard/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface StudentSearchResult {
  id: string;
  name: string;
  studentCode: string | null;
  phone: string | null;
  email: string | null;
  branchId: string;
  branchName: string;
  creditBalance?: string;
}

interface OpenCharge {
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
  };
  charges: OpenCharge[];
}

interface RecordedPaymentResult {
  id: string;
  receiptNumber: string;
  amount: string;
  method: string;
  receivedAt: string;
  allocations: Array<{ chargeId: string; amount: string }>;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'ROCKET', label: 'Rocket' },
  { value: 'BANK', label: 'Bank Transfer / Cheque' },
  { value: 'CARD', label: 'Debit / Credit Card' },
  { value: 'OTHER', label: 'Other' },
] as const;

function getFeeStatusVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'partial') return 'partial';
  if (s === 'overdue') return 'overdue';
  if (s === 'waived') return 'waived';
  if (s === 'void') return 'void';
  return 'due';
}

export default function CollectPaymentPage() {
  const { center } = useCenter();

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);

  // Selected student state
  const [selectedStudent, setSelectedStudent] = React.useState<StudentSearchResult | null>(null);
  const [account, setAccount] = React.useState<StudentAccountStatement | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = React.useState(false);
  const [accountError, setAccountError] = React.useState<string | null>(null);

  // Payment form state
  const [amountStr, setAmountStr] = React.useState('');
  const [method, setMethod] = React.useState<string>('CASH');
  const [reference, setReference] = React.useState('');
  const [receivedAtDate, setReceivedAtDate] = React.useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [note, setNote] = React.useState('');
  const [allocationMode, setAllocationMode] = React.useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualAllocations, setManualAllocations] = React.useState<Record<string, string>>({});

  // Submission & Idempotency
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [recordedPayment, setRecordedPayment] = React.useState<RecordedPaymentResult | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    let ignore = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiGet<{ success: boolean; data: StudentSearchResult[] }>(
          `/api/fees/students/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!ignore && res?.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
        }
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Load student account details when selected
  const loadAccount = React.useCallback(async (studentId: string) => {
    setIsLoadingAccount(true);
    setAccountError(null);
    try {
      const res = await apiGet<{ success: boolean; data: StudentAccountStatement }>(
        `/api/fees/students/${studentId}/account`
      );
      if (res?.success && res.data) {
        setAccount(res.data);
      } else {
        setAccountError('Unable to load student fee statement.');
      }
    } catch {
      setAccountError('Failed to fetch student account. Check server connection.');
    } finally {
      setIsLoadingAccount(false);
    }
  }, []);

  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    setManualAllocations({});
    loadAccount(student.id);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setAccount(null);
    setAmountStr('');
    setManualAllocations({});
    setSubmitError(null);
  };

  // Open charges for allocation (balance > 0 and status !== VOID)
  const openCharges = React.useMemo(() => {
    if (!account?.charges) return [];
    return account.charges.filter(
      (c) => isPositive(c.balance) && c.status !== 'VOID' && c.status !== 'WAIVED'
    );
  }, [account]);

  // Manual allocation calculation using BigInt minor units
  const totalManualAllocated = React.useMemo(() => {
    const values = Object.values(manualAllocations);
    return sum(values);
  }, [manualAllocations]);

  const remainingToAllocate = React.useMemo(() => {
    if (!amountStr) return '0.00';
    return subtract(amountStr, totalManualAllocated);
  }, [amountStr, totalManualAllocated]);

  const isManualAllocationOver = React.useMemo(() => {
    if (!amountStr) return false;
    return compare(totalManualAllocated, amountStr) > 0;
  }, [amountStr, totalManualAllocated]);

  const handleManualAllocationChange = (chargeId: string, val: string) => {
    setManualAllocations((prev) => ({
      ...prev,
      [chargeId]: val,
    }));
  };

  // Quick fill full balance for a charge in manual mode
  const handleFillCharge = (chargeId: string, maxBalance: string) => {
    const currentAlloc = manualAllocations[chargeId] || '0.00';
    const remainingBudget = subtract(amountStr || '0.00', subtract(totalManualAllocated, currentAlloc));
    // If remaining budget < maxBalance, fill remainingBudget; else maxBalance
    const toFill = compare(remainingBudget, maxBalance) < 0 ? remainingBudget : maxBalance;
    const finalFill = isPositive(toFill) ? toFill : '0.00';
    setManualAllocations((prev) => ({
      ...prev,
      [chargeId]: finalFill,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setSubmitError('Please select a student first.');
      return;
    }

    if (!isPositive(amountStr)) {
      setSubmitError('Payment amount must be greater than zero.');
      return;
    }

    if (allocationMode === 'MANUAL' && isManualAllocationOver) {
      setSubmitError('Total manual allocations exceed the payment amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        studentId: selectedStudent.id,
        amount: amountStr,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
        receivedAt: receivedAtDate ? new Date(receivedAtDate).toISOString() : new Date().toISOString(),
      };

      if (allocationMode === 'MANUAL') {
        const items = Object.entries(manualAllocations)
          .filter(([, amt]) => isPositive(amt))
          .map(([chargeId, amt]) => ({
            chargeId,
            amount: amt,
          }));
        payload.allocation = {
          mode: 'MANUAL',
          items,
        };
      } else {
        payload.allocation = {
          mode: 'AUTO',
        };
      }

      const res = await apiPost<{ success: boolean; message?: string; data: RecordedPaymentResult }>(
        '/api/fees/payments',
        payload,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      if (res?.success && res.data) {
        setRecordedPayment(res.data);
        setShowSuccessModal(true);
      } else {
        setSubmitError(res?.message || 'Failed to record payment');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while recording the payment';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewPayment = () => {
    setShowSuccessModal(false);
    setRecordedPayment(null);
    setAmountStr('');
    setReference('');
    setNote('');
    setManualAllocations({});
    setIdempotencyKey(crypto.randomUUID());
    if (selectedStudent) {
      loadAccount(selectedStudent.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collect Payment"
        description="Record fee payments into the append-only ledger with race-free receipt generation"
      />

      {/* 1. Student Search & Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            1. Select Student
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedStudent ? (
            <div className="relative">
              <div className="relative flex items-center">
                <Search
                  className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim().length < 2) {
                      setSearchResults([]);
                    }
                  }}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search by student name, code (e.g. STD-001), or mobile number..."
                  className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                />
                {isSearching && (
                  <RotateCw
                    className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Search dropdown results */}
              {searchFocused && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-card)] border border-border bg-surface p-1 shadow-lg">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.studentCode ? `Code: ${s.studentCode} • ` : ''}
                          {s.phone ? `Phone: ${s.phone} • ` : ''}
                          {s.branchName}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-primary">Select</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchFocused && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-[var(--radius-card)] border border-border bg-surface p-4 text-center text-sm text-muted-foreground shadow-lg">
                  No students found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[var(--radius-control)] border border-border bg-muted/40 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-base">{selectedStudent.name}</span>
                  {selectedStudent.studentCode && (
                    <span className="rounded bg-surface px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground border border-border">
                      {selectedStudent.studentCode}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedStudent.phone && <span>Phone: {selectedStudent.phone} • </span>}
                  <span>Branch: {selectedStudent.branchName}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/fees/students/${selectedStudent.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Full Ledger
                </Link>
                <Button variant="outline" size="sm" onClick={handleClearStudent}>
                  Change Student
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Account Overview & Open Charges */}
      {selectedStudent && (
        <>
          {isLoadingAccount && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <RotateCw className="h-4 w-4 animate-spin text-primary" />
                  Loading student account statement...
                </div>
              </CardContent>
            </Card>
          )}

          {accountError && (
            <ErrorState
              title="Unable to load account"
              message={accountError}
              onRetry={() => loadAccount(selectedStudent.id)}
            />
          )}

          {account && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Outstanding Dues
                </div>
                <div className="mt-2 text-2xl font-bold text-status-danger-text">
                  {formatMoney(account.totals.totalOutstanding, center.currency, center.currencySymbol)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Across {openCharges.length} open charge(s)
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-status-success-text" />
                  Available Student Credit
                </div>
                <div className="mt-2 text-2xl font-bold text-status-success-text">
                  {formatMoney(account.creditBalance, center.currency, center.currencySymbol)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Overpayments applied automatically
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Lifetime Paid
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {formatMoney(account.totals.totalPaid, center.currency, center.currencySymbol)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Net collections</div>
              </div>
            </div>
          )}

          {/* 3. Payment Details Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  2. Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label htmlFor="payment-amount" className="text-sm font-semibold text-foreground">
                      Payment Amount <span className="text-status-danger-text">*</span>
                    </label>
                    <MoneyInput
                      id="payment-amount"
                      value={amountStr}
                      onChange={setAmountStr}
                      placeholder="0.00"
                      currencySymbol={center.currencySymbol}
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <label htmlFor="payment-method" className="text-sm font-semibold text-foreground">
                      Payment Method <span className="text-status-danger-text">*</span>
                    </label>
                    <select
                      id="payment-method"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reference */}
                  <div className="space-y-1.5">
                    <label htmlFor="payment-ref" className="text-sm font-semibold text-foreground">
                      Reference / Transaction ID
                    </label>
                    <input
                      id="payment-ref"
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={
                        ['BKASH', 'NAGAD', 'ROCKET'].includes(method)
                          ? 'e.g. TRX-987654 (Required)'
                          : method === 'BANK'
                          ? 'e.g. Cheque / Slip #1234'
                          : 'Optional transaction reference'
                      }
                      className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                    />
                  </div>

                  {/* Received At */}
                  <div className="space-y-1.5">
                    <label htmlFor="payment-date" className="text-sm font-semibold text-foreground">
                      Date & Time Received
                    </label>
                    <input
                      id="payment-date"
                      type="datetime-local"
                      value={receivedAtDate}
                      onChange={(e) => setReceivedAtDate(e.target.value)}
                      className="flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label htmlFor="payment-note" className="text-sm font-semibold text-foreground">
                    Staff Note
                  </label>
                  <textarea
                    id="payment-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional memo visible on ledger statements..."
                    className="flex w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Allocation Strategy */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  3. Charge Allocation
                </CardTitle>
                <div className="inline-flex rounded-[var(--radius-control)] border border-border p-1 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setAllocationMode('AUTO')}
                    className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-control)] transition-colors ${
                      allocationMode === 'AUTO'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Auto (FIFO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode('MANUAL')}
                    className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-control)] transition-colors ${
                      allocationMode === 'MANUAL'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Manual Allocation
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {allocationMode === 'AUTO' ? (
                  <div className="rounded-[var(--radius-control)] border border-border bg-surface p-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Automatic Oldest-First Allocation</p>
                    <p className="text-xs mt-1">
                      EduFlow will automatically allocate this payment to oldest overdue/unpaid charges. Any remaining
                      amount will be safely preserved as the student&apos;s unallocated credit balance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Specify exact allocation per charge. Total allocations cannot exceed payment amount.
                    </p>

                    {openCharges.length === 0 ? (
                      <EmptyState
                        title="No open charges"
                        description="This student has no outstanding charges to allocate. Excess payment will become student credit balance."
                      />
                    ) : (
                      <div className="divide-y divide-border rounded-[var(--radius-control)] border border-border overflow-hidden">
                        {openCharges.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-2 bg-surface hover:bg-surface-hover/40 transition"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground text-sm">{c.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.batchName} {c.period ? `• ${c.period}` : ''} • Due:{' '}
                                {formatDate(c.dueDate, center.timezone)}
                              </div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <StatusBadge variant={getFeeStatusVariant(c.status)} />
                                <span className="text-xs text-muted-foreground">
                                  Balance: {formatMoney(c.balance, center.currency, center.currencySymbol)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleFillCharge(c.id, c.balance)}
                                className="text-xs h-9"
                              >
                                Max
                              </Button>
                              <div className="w-36">
                                <MoneyInput
                                  value={manualAllocations[c.id] || ''}
                                  onChange={(val) => handleManualAllocationChange(c.id, val)}
                                  placeholder="0.00"
                                  currencySymbol={center.currencySymbol}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual allocation summary bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border bg-muted/40 p-3 text-sm">
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">Allocated: </span>
                        <span>{formatMoney(totalManualAllocated, center.currency, center.currencySymbol)}</span>
                        <span className="mx-2 text-border">|</span>
                        <span className="font-semibold text-foreground">Unallocated Credit: </span>
                        <span className={isManualAllocationOver ? 'text-status-danger-text font-bold' : ''}>
                          {formatMoney(
                            isManualAllocationOver ? '0.00' : remainingToAllocate,
                            center.currency,
                            center.currencySymbol
                          )}
                        </span>
                      </div>
                      {isManualAllocationOver && (
                        <div className="text-xs font-semibold text-status-danger-text flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Allocations exceed payment amount!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Message */}
            {submitError && (
              <div
                role="alert"
                className="rounded-[var(--radius-control)] border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-text"
              >
                {submitError}
              </div>
            )}

            {/* Submit Action */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearStudent}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSubmitting ||
                  !isPositive(amountStr) ||
                  (allocationMode === 'MANUAL' && isManualAllocationOver)
                }
                className="min-w-[160px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Recording...
                  </span>
                ) : (
                  `Collect ${formatMoney(amountStr || '0', center.currency, center.currencySymbol)}`
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* 5. Success Receipt Modal */}
      {showSuccessModal && recordedPayment && (
        <Modal
          isOpen={showSuccessModal}
          onClose={handleResetForNewPayment}
          title="Payment Recorded Successfully"
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center p-4 rounded-full bg-status-success-bg w-16 h-16 mx-auto text-status-success-text">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="text-center space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Receipt Number
              </div>
              <div className="text-xl font-mono font-bold text-foreground">
                {recordedPayment.receiptNumber}
              </div>
              <div className="text-sm font-semibold text-status-success-text">
                Amount Paid: {formatMoney(recordedPayment.amount, center.currency, center.currencySymbol)} ({recordedPayment.method})
              </div>
            </div>

            <div className="rounded-[var(--radius-control)] border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div>Student: <span className="font-semibold text-foreground">{selectedStudent?.name}</span></div>
              <div>Date: <span className="font-semibold text-foreground">{formatDate(recordedPayment.receivedAt, center.timezone)}</span></div>
              <div>Allocations: <span className="font-semibold text-foreground">{recordedPayment.allocations.length} charge(s) settled</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3">
              <Link
                href={`/fees/receipts/${recordedPayment.id}`}
                target="_blank"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForNewPayment}
                className="flex-1"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
