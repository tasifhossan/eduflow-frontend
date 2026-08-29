'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

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
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN') {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
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
        <Link href={`/batches/${batchId}`} className="text-accent hover:underline text-sm font-medium">
          &larr; Back to batch details
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500 gap-x-2">
        <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
        <span>/</span>
        <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch.name}</Link>
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
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            + Record Payment
          </button>
          <button
            onClick={() => {
              setShowInstallmentModal(true);
              setInstallmentError(null);
            }}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Target Due</span>
          <div className="text-2xl font-bold text-gray-900">৳{totalAmountDue.toLocaleString()}</div>
          <p className="text-xs text-gray-500">{filteredPayments.length} payment records listed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-1">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Collected</span>
          <div className="text-2xl font-bold text-emerald-700">৳{totalAmountPaid.toLocaleString()}</div>
          <p className="text-xs text-gray-500">Collected across filtered records</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-1">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Balance</span>
          <div className="text-2xl font-bold text-amber-700">৳{totalPending.toLocaleString()}</div>
          <p className="text-xs text-gray-500">Remaining due amount</p>
        </div>
      </div>

      {/* Filter Bar & Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment Records</h2>
            <p className="text-xs text-gray-500">History of fee payments and installment status</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="text-xs font-semibold text-gray-500 mr-2">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="ALL">All Periods</option>
                {distinctPeriods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mr-2">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
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
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm font-medium">No payment records found</p>
            <p className="text-xs text-gray-400">Use "Record Payment" or "Create Installment Plan" to add payment entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Period</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount Due</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount Paid</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes / Paid At</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{p.student?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{p.student?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                      {p.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ৳{p.amountDue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ৳{p.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
                        p.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'PARTIAL'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {p.notes && <div className="text-gray-800 font-medium mb-0.5">{p.notes}</div>}
                      {p.paidAt && <div className="text-emerald-600 text-[11px]">Paid: {new Date(p.paidAt).toLocaleDateString()}</div>}
                      {!p.notes && !p.paidAt && <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <button
                        onClick={() => {
                          setSelectedPaymentForUpdate(p);
                          setUpdateAmountPaid(String(p.amountPaid));
                          setUpdateNotes(p.notes || '');
                          setUpdateError(null);
                        }}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Record Fee Payment</h3>
              <button onClick={() => setShowRecordModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            {recordError && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-600">
                {recordError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student</label>
                <select
                  value={recordStudentId}
                  onChange={(e) => handleStudentSelectForRecord(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-08 or FULL"
                    value={recordPeriod}
                    onChange={(e) => setRecordPeriod(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Due (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Auto-derived if empty"
                    value={recordAmountDue}
                    onChange={(e) => setRecordAmountDue(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={recordAmountPaid}
                    onChange={(e) => setRecordAmountPaid(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={recordDueDate}
                    onChange={(e) => setRecordDueDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via bkash, Cash receipt #104"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                />
              </div>

              <div className="flex gap-x-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {savingPayment ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Update Payment Record</h3>
                <p className="text-xs text-gray-500">
                  {selectedPaymentForUpdate.student?.name} — {selectedPaymentForUpdate.period}
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentForUpdate(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 border border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Total Amount Due:</span>
                <span className="font-bold text-gray-900">৳{selectedPaymentForUpdate.amountDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Current Amount Paid:</span>
                <span className="font-bold text-gray-900">৳{selectedPaymentForUpdate.amountPaid.toLocaleString()}</span>
              </div>
            </div>

            {updateError && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-600">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Total Amount Paid (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={updateAmountPaid}
                  onChange={(e) => setUpdateAmountPaid(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                  required
                />
                <p className="text-[11px] text-amber-600 font-medium mt-1">
                  ⚠️ Note: This REPLACES the total amount paid (e.g. if previous paid was ৳500 and student paid ৳300 more, enter 800).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Added ৳300 partial payment"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
                />
              </div>

              <div className="flex gap-x-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updatingPayment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {updatingPayment ? 'Updating...' : 'Save Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForUpdate(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Installment Plan</h3>
                <p className="text-xs text-gray-500">Set up multiple payment installments (e.g. for admission fees)</p>
              </div>
              <button
                onClick={() => setShowInstallmentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {installmentError && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-600">
                {installmentError}
              </div>
            )}

            <form onSubmit={handleCreateInstallmentPlan} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student</label>
                <select
                  value={instStudentId}
                  onChange={(e) => setInstStudentId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent text-gray-900"
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
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Installments (Minimum 2 required)
                  </label>
                  <button
                    type="button"
                    onClick={addInstallmentRow}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    + Add Installment
                  </button>
                </div>

                {installments.map((inst, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Period Label</label>
                      <input
                        type="text"
                        placeholder="e.g. INSTALLMENT_1"
                        value={inst.period}
                        onChange={(e) => updateInstallmentRow(index, 'period', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Amount Due (৳)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="Amount"
                        value={inst.amountDue}
                        onChange={(e) => updateInstallmentRow(index, 'amountDue', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => updateInstallmentRow(index, 'dueDate', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent"
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

              <div className="flex gap-x-2 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={savingInstallment}
                  className="flex-1 inline-flex justify-center items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {savingInstallment ? 'Creating Installments...' : 'Create Installment Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallmentModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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
