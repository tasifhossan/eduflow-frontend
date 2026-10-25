'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  enrollmentId?: string;
  customFeeAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
}

interface FeePayment {
  id: string;
  studentId: string;
  batchId: string;
  period: string;
  amountDue: number;
  amountPaid: number;
  status: 'DUE' | 'PARTIAL' | 'PAID';
  dueDate?: string | null;
  paidAt?: string | null;
  recordedById: string;
  notes?: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

interface BatchDetails {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  feeType?: 'MONTHLY' | 'ONE_TIME';
  feeAmount?: number;
}

interface InstallmentItem {
  period: string;
  amountDue: string;
  dueDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchPaymentsPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  // Core Data States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Page Load & Feedback States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Controls
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [selectedPaymentForUpdate, setSelectedPaymentForUpdate] = useState<FeePayment | null>(null);

  // Single Payment Form States
  const [recordStudentId, setRecordStudentId] = useState('');
  const [recordPeriod, setRecordPeriod] = useState('');
  const [recordAmountDue, setRecordAmountDue] = useState('');
  const [recordAmountPaid, setRecordAmountPaid] = useState('0');
  const [recordDueDate, setRecordDueDate] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Update Payment Form States
  const [updateAmountPaid, setUpdateAmountPaid] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Installment Plan Form States
  const [instStudentId, setInstStudentId] = useState('');
  const [installments, setInstallments] = useState<InstallmentItem[]>([
    { period: 'INSTALLMENT_1', amountDue: '', dueDate: '' },
    { period: 'INSTALLMENT_2', amountDue: '', dueDate: '' },
  ]);
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [installmentError, setInstallmentError] = useState<string | null>(null);

  // Admin Auth Check
  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
    init();
  }, [router]);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch batch info
      const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
      if (batchRes.success) {
        setBatch(batchRes.data);
      }

      // Fetch enrolled students
      const studentsRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`)
        .catch(() => ({ success: false, data: [] }));
      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data);
      }

      // Fetch batch payments
      const paymentsRes = await apiGet<{ success: boolean; data: FeePayment[] }>(`/api/batches/${batchId}/payments`)
        .catch(() => ({ success: false, data: [] }));
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [batchId]);

  // Auto pre-fill amountDue when student is selected in Record Payment form
  const handleStudentSelectForRecord = async (sId: string) => {
    setRecordStudentId(sId);
    if (!sId) return;

    const studentObj = students.find((s) => s.id === sId);
    if (studentObj && studentObj.enrollmentId) {
      try {
        const netFeeRes = await apiGet<{ success: boolean; data: { netFee: number } }>(
          `/api/enrollments/${studentObj.enrollmentId}/net-fee`
        );
        if (netFeeRes.success && netFeeRes.data) {
          setRecordAmountDue(String(netFeeRes.data.netFee));
        }
      } catch (err) {
        // Fallback to batch feeAmount if net fee endpoint fails
        if (batch?.feeAmount !== undefined) {
          setRecordAmountDue(String(batch.feeAmount));
        }
      }
    } else if (batch?.feeAmount !== undefined) {
      setRecordAmountDue(String(batch.feeAmount));
    }
  };

  // Submit Single Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordStudentId || !recordPeriod) {
      setRecordError('Student and Period are required');
      return;
    }

    setSavingPayment(true);
    setRecordError(null);

    try {
      const response = await apiPost('/api/payments', {
        studentId: recordStudentId,
        batchId,
        period: recordPeriod,
        amountDue: recordAmountDue ? Number(recordAmountDue) : undefined,
        amountPaid: Number(recordAmountPaid || 0),
        dueDate: recordDueDate || null,
        notes: recordNotes || null,
      });

      if (response && response.success) {
        setSuccessMsg('Payment record created successfully!');
        setShowRecordModal(false);
        setRecordStudentId('');
        setRecordPeriod('');
        setRecordAmountDue('');
        setRecordAmountPaid('0');
        setRecordDueDate('');
        setRecordNotes('');
        await loadData();
      } else {
        setRecordError(response.message || 'Failed to record payment');
      }
    } catch (err: any) {
      setRecordError(err.message || 'An error occurred while creating payment');
    } finally {
      setSavingPayment(false);
    }
  };

  // Submit Update Payment
  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForUpdate) return;

    setUpdatingPayment(true);
    setUpdateError(null);

    try {
      const response = await apiPatch(`/api/payments/${selectedPaymentForUpdate.id}`, {
        amountPaid: Number(updateAmountPaid),
        notes: updateNotes || null,
      });

      if (response && response.success) {
        setSuccessMsg('Payment record updated successfully!');
        setSelectedPaymentForUpdate(null);
        await loadData();
      } else {
        setUpdateError(response.message || 'Failed to update payment');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'An error occurred while updating payment');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Installments Management Helpers
  const addInstallmentRow = () => {
    setInstallments((prev) => [
      ...prev,
      { period: `INSTALLMENT_${prev.length + 1}`, amountDue: '', dueDate: '' },
    ]);
  };

  const removeInstallmentRow = (index: number) => {
    if (installments.length <= 2) return;
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInstallmentRow = (index: number, field: keyof InstallmentItem, value: string) => {
    setInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submit Installment Plan
  const handleCreateInstallmentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instStudentId) {
      setInstallmentError('Student selection is required');
      return;
    }

    if (installments.length < 2) {
      setInstallmentError('Installment plan requires at least 2 items');
      return;
    }

    for (let i = 0; i < installments.length; i++) {
      if (!installments[i].period.trim() || !installments[i].amountDue) {
        setInstallmentError(`Installment #${i + 1} requires a Period and Amount Due`);
        return;
      }
    }

    setSavingInstallment(true);
    setInstallmentError(null);

    try {
      const payload = {
        studentId: instStudentId,
        batchId,
        installments: installments.map((inst) => ({
          period: inst.period.trim(),
          amountDue: Number(inst.amountDue),
          dueDate: inst.dueDate || null,
        })),
      };

      const response = await apiPost('/api/payments/installment-plan', payload);

      if (response && response.success) {
        setSuccessMsg('Installment plan created successfully!');
        setShowInstallmentModal(false);
        setInstStudentId('');
        setInstallments([
          { period: 'INSTALLMENT_1', amountDue: '', dueDate: '' },
          { period: 'INSTALLMENT_2', amountDue: '', dueDate: '' },
        ]);
        await loadData();
      } else {
        setInstallmentError(response.message || 'Failed to create installment plan');
      }
    } catch (err: any) {
      setInstallmentError(err.message || 'An error occurred while creating installment plan');
    } finally {
      setSavingInstallment(false);
    }
  };

  // Distinct Periods for Filter
  const distinctPeriods = Array.from(new Set(payments.map((p) => p.period)));

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const matchesPeriod = selectedPeriod === 'ALL' || p.period === selectedPeriod;
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
    return matchesPeriod && matchesStatus;
  });

  // Calculate Summary Metrics
  const totalAmountDue = filteredPayments.reduce((acc, p) => acc + p.amountDue, 0);
  const totalAmountPaid = filteredPayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalPending = totalAmountDue - totalAmountPaid;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading batch payments...</span>
      </div>
    );
  }

  if (errorMsg || !batch) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Batch</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Batch not found or access denied.'}</p>
        </div>
        <Link href={`/batches/${batchId}`} className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 gap-x-2">
        <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
        <span>/</span>
        <Link href={`/batches/${batchId}`} className="hover:text-primary font-medium">{batch.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Fee Payments</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fee Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Payment tracking, due summaries, and installment plans for <span className="font-semibold text-gray-700">{batch.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowRecordModal(true);
              setRecordError(null);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
          >
            + Record Payment
          </button>
          <button
            onClick={() => {
              setShowInstallmentModal(true);
              setInstallmentError(null);
            }}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
          >
            + Create Installment Plan
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex justify-between items-center text-sm text-green-700">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-800 font-bold">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-5 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Target Due</span>
          <div className="text-2xl font-bold text-foreground">৳{totalAmountDue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{filteredPayments.length} payment records listed</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-5 space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Collected</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">৳{totalAmountPaid.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Collected across filtered records</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-5 space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Balance</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">৳{totalPending.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Remaining due amount</p>
        </div>
      </div>

      {/* Filter Bar & Table Container */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden space-y-4">
        <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Payment Records</h2>
            <p className="text-xs text-muted-foreground">History of fee payments and installment status</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mr-2">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Periods</option>
                {distinctPeriods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mr-2">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="DUE">DUE</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-foreground">No payment records found</p>
            <p className="text-xs text-muted-foreground">Use "Record Payment" or "Create Installment Plan" to add payment entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-hover/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Due</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Paid</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes / Paid At</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{p.student?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{p.student?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                      {p.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">
                      ৳{p.amountDue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">
                      ৳{p.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
                        p.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : p.status === 'PARTIAL'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : <span className="text-muted-foreground/60 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {p.notes && <div className="text-foreground font-medium mb-0.5">{p.notes}</div>}
                      {p.paidAt && <div className="text-emerald-600 dark:text-emerald-400 text-[11px]">Paid: {new Date(p.paidAt).toLocaleDateString()}</div>}
                      {!p.notes && !p.paidAt && <span className="text-muted-foreground/60 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <button
                        onClick={() => {
                          setSelectedPaymentForUpdate(p);
                          setUpdateAmountPaid(String(p.amountPaid));
                          setUpdateNotes(p.notes || '');
                          setUpdateError(null);
                        }}
                        className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Single Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Record Fee Payment</h3>
              <button onClick={() => setShowRecordModal(false)} className="text-muted-foreground hover:text-foreground text-xl font-bold transition-colors">&times;</button>
            </div>

            {recordError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-300">
                {recordError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Student</label>
                <select
                  value={recordStudentId}
                  onChange={(e) => handleStudentSelectForRecord(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                  required
                >
                  <option value="">Select enrolled student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-08 or FULL"
                    value={recordPeriod}
                    onChange={(e) => setRecordPeriod(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Amount Due (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Auto-derived if empty"
                    value={recordAmountDue}
                    onChange={(e) => setRecordAmountDue(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Amount Paid (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={recordAmountPaid}
                    onChange={(e) => setRecordAmountPaid(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={recordDueDate}
                    onChange={(e) => setRecordDueDate(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via bkash, Cash receipt #104"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex gap-x-2 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {savingPayment ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-foreground border border-border bg-surface rounded-lg hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Payment Modal */}
      {selectedPaymentForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Update Payment Record</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedPaymentForUpdate.student?.name} — {selectedPaymentForUpdate.period}
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentForUpdate(null)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="bg-surface-hover rounded-lg p-3 text-xs space-y-1 border border-border">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Amount Due:</span>
                <span className="font-bold text-foreground">৳{selectedPaymentForUpdate.amountDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Current Amount Paid:</span>
                <span className="font-bold text-foreground">৳{selectedPaymentForUpdate.amountPaid.toLocaleString()}</span>
              </div>
            </div>

            {updateError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-300">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Total Amount Paid (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={updateAmountPaid}
                  onChange={(e) => setUpdateAmountPaid(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                  required
                />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                  ⚠️ Note: This REPLACES the total amount paid (e.g. if previous paid was ৳500 and student paid ৳300 more, enter 800).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Added ৳300 partial payment"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex gap-x-2 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={updatingPayment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {updatingPayment ? 'Updating...' : 'Save Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForUpdate(null)}
                  className="px-4 py-2 text-sm font-semibold text-foreground border border-border bg-surface rounded-lg hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Installment Plan Modal */}
      {showInstallmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Create Installment Plan</h3>
                <p className="text-xs text-muted-foreground">Set up multiple payment installments (e.g. for admission fees)</p>
              </div>
              <button
                onClick={() => setShowInstallmentModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            {installmentError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-300">
                {installmentError}
              </div>
            )}

            <form onSubmit={handleCreateInstallmentPlan} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Student</label>
                <select
                  value={instStudentId}
                  onChange={(e) => setInstStudentId(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                  required
                >
                  <option value="">Select enrolled student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Installment Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Installments (Minimum 2 required)
                  </label>
                  <button
                    type="button"
                    onClick={addInstallmentRow}
                    className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                  >
                    + Add Installment
                  </button>
                </div>

                {installments.map((inst, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-surface-hover p-3 rounded-lg border border-border">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Period Label</label>
                      <input
                        type="text"
                        placeholder="e.g. INSTALLMENT_1"
                        value={inst.period}
                        onChange={(e) => updateInstallmentRow(index, 'period', e.target.value)}
                        className="block w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Amount Due (৳)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="Amount"
                        value={inst.amountDue}
                        onChange={(e) => updateInstallmentRow(index, 'amountDue', e.target.value)}
                        className="block w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => updateInstallmentRow(index, 'dueDate', e.target.value)}
                        className="block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="col-span-1 text-right pt-4">
                      <button
                        type="button"
                        onClick={() => removeInstallmentRow(index)}
                        disabled={installments.length <= 2}
                        className="text-red-500 hover:text-red-700 text-base font-bold disabled:opacity-30"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-x-2 pt-3 border-t border-border">
                <button
                  type="submit"
                  disabled={savingInstallment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {savingInstallment ? 'Creating Installments...' : 'Create Installment Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallmentModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-foreground border border-border bg-surface rounded-lg hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
