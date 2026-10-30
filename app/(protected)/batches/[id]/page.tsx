'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { EmptyState } from '@/components/ui/empty-state';
import { useCenter } from '@/components/providers/center-provider';
import { formatMoney } from '@/lib/format';
import { MoneyInput } from '@/components/ui/money-input';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  enrollmentId?: string;
  customFeeAmount?: number | null;
  discountType?: 'FIXED' | 'PERCENTAGE' | null;
  discountValue?: number | null;
  discountReason?: string | null;
}

interface BatchDetails {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  feeType?: 'MONTHLY' | 'ONE_TIME';
  feeBilling?: 'MONTHLY' | 'ONE_TIME' | 'NONE';
  feeAmount?: number;
  subject: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    name: string;
  } | null;
  enrolledStudentsCount: number;
}

interface NetFeeData {
  baseFee: number;
  customFeeAmount?: number | null;
  discountType?: 'FIXED' | 'PERCENTAGE' | null;
  discountValue?: number | null;
  discountReason?: string | null;
  netFee: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  // User state
  const [userRole, setUserRole] = useState<string>('');

  const { center } = useCenter();

  // Main States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [netFeeMap, setNetFeeMap] = useState<Record<string, NetFeeData>>({});

  // Batch Fee Edit States
  const [isEditingBatchFee, setIsEditingBatchFee] = useState(false);
  const [feeTypeInput, setFeeTypeInput] = useState<'MONTHLY' | 'ONE_TIME' | 'NONE'>('MONTHLY');
  const [feeAmountInput, setFeeAmountInput] = useState<string>('0');
  const [savingBatchFee, setSavingBatchFee] = useState(false);
  const [batchFeeError, setBatchFeeError] = useState<string | null>(null);
  const [batchFeeSuccess, setBatchFeeSuccess] = useState<string | null>(null);

  // Student Fee Modal States
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<Student | null>(null);
  const [studentCustomFeeInput, setStudentCustomFeeInput] = useState<string>('');
  const [studentDiscountTypeInput, setStudentDiscountTypeInput] = useState<'NONE' | 'FIXED' | 'PERCENTAGE'>('NONE');
  const [studentDiscountValueInput, setStudentDiscountValueInput] = useState<string>('');
  const [studentDiscountReasonInput, setStudentDiscountReasonInput] = useState<string>('');
  const [savingStudentFee, setSavingStudentFee] = useState(false);
  const [studentFeeError, setStudentFeeError] = useState<string | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Unenroll Modal State
  const [unenrollStudentTarget, setUnenrollStudentTarget] = useState<Student | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [unenrollError, setUnenrollError] = useState<string | null>(null);

  const handleUnenrollStudent = async () => {
    if (!unenrollStudentTarget || !unenrollStudentTarget.enrollmentId) return;

    setUnenrolling(true);
    setUnenrollError(null);

    try {
      const response = await apiPatch(`/api/enrollments/${unenrollStudentTarget.enrollmentId}/unenroll`, {});

      if (response && response.success) {
        setUnenrollStudentTarget(null);
        // Refresh enrolled students list
        const enrolledRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`);
        if (enrolledRes.success && enrolledRes.data) {
          setEnrolledStudents(enrolledRes.data);
        }
      } else {
        setUnenrollError(
          typeof response === 'object' && response !== null && 'message' in response
            ? String((response as { message: unknown }).message)
            : 'Failed to unenroll student'
        );
      }
    } catch (err: unknown) {
      setUnenrollError(err instanceof Error ? err.message : 'Error unenrolling student');
    } finally {
      setUnenrolling(false);
    }
  };


  // Helper to load net fee for a student's enrollment
  const loadNetFeeForStudent = async (enrollmentId: string) => {
    try {
      const res = await apiGet<{ success: boolean; data: NetFeeData }>(`/api/enrollments/${enrollmentId}/net-fee`);
      if (res.success && res.data) {
        setNetFeeMap((prev) => ({ ...prev, [enrollmentId]: res.data }));
      }
    } catch (err) {
      console.error(`Failed to load net fee for enrollment ${enrollmentId}`, err);
    }
  };

  // Role check and initial data load
  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserRole(user.role);
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        router.push('/dashboard');
        return;
      }
      loadBatchData();
    }
    init();

    async function loadBatchData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch batch details
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
          setFeeTypeInput((batchRes.data.feeBilling as 'MONTHLY' | 'ONE_TIME' | 'NONE') || batchRes.data.feeType || 'MONTHLY');
          setFeeAmountInput(String(batchRes.data.feeAmount ?? 0));
        }

        // 2. Fetch enrolled students safely
        const enrolledRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`)
          .catch(() => ({ success: false, data: [] }));
        if (enrolledRes.success && enrolledRes.data) {
          setEnrolledStudents(enrolledRes.data);

          // Fetch net fees for all enrolled students
          for (const student of enrolledRes.data) {
            if (student.enrollmentId) {
              loadNetFeeForStudent(student.enrollmentId);
            }
          }
        }

        // 3. Fetch all branch students for enrollment list
        const studentsRes = await apiGet<{ success: boolean; data: Student[] }>('/api/users?role=STUDENT')
          .catch(() => ({ success: false, data: [] }));

        if (studentsRes.success && studentsRes.data && studentsRes.data.length > 0) {
          setAvailableStudents(studentsRes.data);
        } else {
          setAvailableStudents([]);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load batch details');
      } finally {
        setLoading(false);
      }
    }

    loadBatchData();
  }, [batchId, router]);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setEnrollError('Please select a student');
      return;
    }

    setEnrolling(true);
    setEnrollError(null);
    setEnrollSuccess(null);

    try {
      const response = await apiPost('/api/enrollments', {
        batchId,
        studentId: selectedStudentId,
      });

      if (response && response.success) {
        setEnrollSuccess('Student enrolled successfully!');
        setSelectedStudentId('');

        // Refresh enrolled students list
        const enrolledRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`);
        if (enrolledRes.success && enrolledRes.data) {
          setEnrolledStudents(enrolledRes.data);

          // Fetch net fees for updated list
          for (const student of enrolledRes.data) {
            if (student.enrollmentId) {
              loadNetFeeForStudent(student.enrollmentId);
            }
          }
        }
      } else {
        setEnrollError(
          typeof response === 'object' && response !== null && 'message' in response
            ? String((response as { message: unknown }).message)
            : 'Failed to enroll student'
        );
      }
    } catch (err: unknown) {
      setEnrollError(err instanceof Error ? err.message : 'An error occurred during enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUpdateBatchFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBatchFee(true);
    setBatchFeeError(null);
    setBatchFeeSuccess(null);

    try {
      const response = await apiPatch(`/api/batches/${batchId}/fee`, {
        feeBilling: feeTypeInput,
        feeType: feeTypeInput !== 'NONE' ? feeTypeInput : undefined,
        feeAmount: feeTypeInput === 'NONE' ? 0 : Number(feeAmountInput),
      });

      if (response && response.success) {
        setBatchFeeSuccess('Batch fee settings updated successfully!');
        setIsEditingBatchFee(false);
        setBatch((prev) => (prev ? { ...prev, feeBilling: feeTypeInput, feeType: feeTypeInput !== 'NONE' ? feeTypeInput : (prev.feeType || 'MONTHLY'), feeAmount: feeTypeInput === 'NONE' ? 0 : Number(feeAmountInput) } : null));

        // Refetch all student net fees as base fee changed
        for (const student of enrolledStudents) {
          if (student.enrollmentId) {
            loadNetFeeForStudent(student.enrollmentId);
          }
        }
      } else {
        setBatchFeeError(
          typeof response === 'object' && response !== null && 'message' in response
            ? String((response as { message: unknown }).message)
            : 'Failed to update batch fee'
        );
      }
    } catch (err: unknown) {
      setBatchFeeError(err instanceof Error ? err.message : 'Error updating batch fee');
    } finally {
      setSavingBatchFee(false);
    }
  };

  const openSetStudentFeeModal = (student: Student) => {
    setSelectedStudentForFee(student);
    const existingNetFee = student.enrollmentId ? netFeeMap[student.enrollmentId] : null;

    setStudentCustomFeeInput(
      existingNetFee?.customFeeAmount !== undefined && existingNetFee?.customFeeAmount !== null
        ? String(existingNetFee.customFeeAmount)
        : student.customFeeAmount !== undefined && student.customFeeAmount !== null
        ? String(student.customFeeAmount)
        : ''
    );

    const type = existingNetFee?.discountType || student.discountType;
    setStudentDiscountTypeInput(type ? (type as 'FIXED' | 'PERCENTAGE') : 'NONE');

    const val = existingNetFee?.discountValue ?? student.discountValue;
    setStudentDiscountValueInput(val !== undefined && val !== null ? String(val) : '');

    const reason = existingNetFee?.discountReason ?? student.discountReason;
    setStudentDiscountReasonInput(reason || '');

    setStudentFeeError(null);
  };

  const handleSaveStudentFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForFee?.enrollmentId) {
      setStudentFeeError('Enrollment ID missing for this student');
      return;
    }

    setSavingStudentFee(true);
    setStudentFeeError(null);

    try {
      const customFeeAmount = studentCustomFeeInput.trim() !== '' ? Number(studentCustomFeeInput) : null;
      const discountType = studentDiscountTypeInput === 'NONE' ? null : studentDiscountTypeInput;
      const discountValue =
        studentDiscountTypeInput !== 'NONE' && studentDiscountValueInput.trim() !== ''
          ? Number(studentDiscountValueInput)
          : null;
      const discountReason = studentDiscountReasonInput.trim() !== '' ? studentDiscountReasonInput : null;

      const response = await apiPatch(`/api/enrollments/${selectedStudentForFee.enrollmentId}/fee`, {
        customFeeAmount,
        discountType,
        discountValue,
        discountReason,
      });

      if (response && response.success) {
        // Refetch net fee for this student
        await loadNetFeeForStudent(selectedStudentForFee.enrollmentId);
        setSelectedStudentForFee(null);
      } else {
        setStudentFeeError(
          typeof response === 'object' && response !== null && 'message' in response
            ? String((response as { message: unknown }).message)
            : 'Failed to update student fee'
        );
      }
    } catch (err: unknown) {
      setStudentFeeError(err instanceof Error ? err.message : 'Error updating student fee');
    } finally {
      setSavingStudentFee(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading batch details...</span>
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
        <Link href="/batches" className="text-primary hover:text-primary-hover hover:underline text-sm font-medium">
          &larr; Back to batches list
        </Link>
      </div>
    );
  }

  const nonEnrolledStudents = availableStudents.filter(
    (student) => !enrolledStudents.some((enrolled) => enrolled.id === student.id)
  );

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/batches" className="hover:text-primary font-medium">Batches</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{batch.name}</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{batch.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Batch details, routines, attendance, fees, and student list</p>
          </div>
          {/* Quick Links */}
          <div className="flex gap-x-3 flex-wrap gap-y-2">
            <Link
              href={`/batches/${batchId}/resources`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
            >
              Study Materials
            </Link>
            <Link
              href={`/batches/${batchId}/routine`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
            >
              Class Routine
            </Link>
            <Link
              href={`/batches/${batchId}/syllabus`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
            >
              Syllabus Progress
            </Link>
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT') && (
              <Link
                href={`/fees/dues?batchId=${batchId}`}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
              >
                Dues & Billing
              </Link>
            )}
            <Link
              href={`/batches/${batchId}/analytics`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
            >
              Analytics
            </Link>
            <Link
              href={`/batches/${batchId}/attendance`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
            >
              Mark Attendance
            </Link>
          </div>
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Fee Settings & Enrollment */}
          <div className="space-y-6 lg:col-span-1">
            {/* Details Card */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">Batch Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground font-medium block">Type</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 mt-0.5 text-xs font-semibold ring-1 ring-inset ${
                    batch.type === 'ACADEMIC'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-blue-700/10'
                      : 'bg-primary/10 text-primary ring-primary/20'
                  }`}>
                    {batch.type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Class Level</span>
                  <span className="text-foreground font-semibold">{batch.classLevel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Subject</span>
                  <span className="text-foreground font-semibold">{batch.subject.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Assigned Teacher</span>
                  <span className="text-foreground font-semibold">
                    {batch.teacher?.name || <span className="text-muted-foreground italic font-normal">Unassigned</span>}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Total Enrolled</span>
                  <span className="text-foreground font-semibold">{enrolledStudents.length} Students</span>
                </div>
              </div>
            </div>

            {/* Fee Settings Section */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-lg font-bold text-foreground">Fee Settings</h2>
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <button
                    onClick={() => {
                      setFeeTypeInput((batch.feeBilling as 'MONTHLY' | 'ONE_TIME' | 'NONE') || batch.feeType || 'MONTHLY');
                      setFeeAmountInput(String(batch.feeAmount ?? 0));
                      setIsEditingBatchFee(!isEditingBatchFee);
                      setBatchFeeError(null);
                      setBatchFeeSuccess(null);
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                  >
                    {isEditingBatchFee ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>

              {batchFeeSuccess && (
                <div className="rounded-md bg-status-success-bg p-3 border border-status-success-border text-xs text-status-success-text">
                  {batchFeeSuccess}
                </div>
              )}
              {batchFeeError && (
                <div className="rounded-md bg-status-danger-bg p-3 border border-status-danger-border text-xs text-status-danger-text">
                  {batchFeeError}
                </div>
              )}

              {!isEditingBatchFee ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground font-medium block">Billing Type</span>
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 mt-0.5 text-xs font-semibold bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                      {batch.feeType || 'MONTHLY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block">Base Fee Amount</span>
                    <span className="text-foreground font-bold text-lg font-mono">
                      {formatMoney(batch.feeAmount, center.currency, center.currencySymbol)}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateBatchFee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Billing Type
                    </label>
                    <select
                      value={feeTypeInput}
                      onChange={(e) => setFeeTypeInput(e.target.value as 'MONTHLY' | 'ONE_TIME' | 'NONE')}
                      className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="MONTHLY">Monthly Billing</option>
                      <option value="ONE_TIME">One-time Billing</option>
                      <option value="NONE">No Fee / None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Base Fee Amount
                    </label>
                    <MoneyInput
                      value={feeAmountInput}
                      onChange={setFeeAmountInput}
                      placeholder="0.00"
                      currencySymbol={center.currencySymbol}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Changing the batch fee affects only future generated dues; existing ledger charges are append-only and preserved.
                  </p>
                  <div className="flex gap-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingBatchFee}
                      className="flex-1 inline-flex justify-center items-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                    >
                      {savingBatchFee ? 'Saving...' : 'Save Fee'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingBatchFee(false)}
                      className="px-3 py-2 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-surface-hover transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Enroll Form Card */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">Enroll Student</h2>

              {enrollError && (
                <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                  {enrollError}
                </div>
              )}
              {enrollSuccess && (
                <div className="rounded-md bg-green-500/10 p-3 border border-green-500/20 text-xs text-green-600 dark:text-green-400">
                  {enrollSuccess}
                </div>
              )}

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label htmlFor="studentSelect" className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Select student from branch list
                  </label>
                  {nonEnrolledStudents.length === 0 ? (
                    <EmptyState
                      title="No students available"
                      description="No eligible students found in the branch roster to enroll in this batch."
                      className="p-4"
                    />
                  ) : (
                    <select
                      id="studentSelect"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      required
                    >
                      <option value="">Select a student</option>
                      {nonEnrolledStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={enrolling || nonEnrolledStudents.length === 0}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Enrolled Students List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Enrolled Students</h2>
                <p className="text-xs text-muted-foreground mt-1">Students registered and active in this batch</p>
              </div>

              {enrolledStudents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                  </svg>
                  <p className="mt-4 text-sm font-medium">No students enrolled yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the enrollment panel to add students to this class.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-hover/50">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student Info</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Breakdown</th>
                        {userRole === 'ADMIN' && (
                          <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      {enrolledStudents.map((student) => {
                        const netFeeInfo = student.enrollmentId ? netFeeMap[student.enrollmentId] : null;

                        return (
                          <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-foreground">{student.name}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {student.phone || <span className="text-muted-foreground italic">None</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {netFeeInfo ? (
                                <div>
                                  <div className="text-sm font-bold text-foreground">
                                    {formatMoney(netFeeInfo.netFee, center.currency, center.currencySymbol)}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
                                    <span>
                                      Base: {formatMoney(netFeeInfo.customFeeAmount ?? netFeeInfo.baseFee, center.currency, center.currencySymbol)}
                                    </span>
                                    {netFeeInfo.customFeeAmount != null && (
                                      <span className="inline-flex items-center rounded bg-amber-500/10 px-1 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        Custom
                                      </span>
                                    )}
                                    {netFeeInfo.discountType && netFeeInfo.discountValue && (
                                      <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        -{netFeeInfo.discountType === 'FIXED' ? formatMoney(netFeeInfo.discountValue, center.currency, center.currencySymbol) : `${netFeeInfo.discountValue}%`}
                                        {netFeeInfo.discountReason ? ` (${netFeeInfo.discountReason})` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Loading fee...</span>
                              )}
                            </td>
                            {userRole === 'ADMIN' && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-x-2">
                                  <button
                                    onClick={() => openSetStudentFeeModal(student)}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-hover transition"
                                  >
                                    Set Fee / Discount
                                  </button>
                                  <button
                                    onClick={() => {
                                      setUnenrollStudentTarget(student);
                                      setUnenrollError(null);
                                    }}
                                    className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
                                  >
                                    Unenroll
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Set Student Fee / Discount Modal */}
      {selectedStudentForFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Set Fee & Discount</h3>
                <p className="text-xs text-muted-foreground">{selectedStudentForFee.name}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForFee(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {studentFeeError && (
              <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {studentFeeError}
              </div>
            )}

            <form onSubmit={handleSaveStudentFee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Custom Fee Override
                </label>
                <MoneyInput
                  placeholder={`Default: ${formatMoney(batch.feeAmount ?? 0, center.currency, center.currencySymbol)}`}
                  value={studentCustomFeeInput}
                  onChange={setStudentCustomFeeInput}
                  currencySymbol={center.currencySymbol}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Leave empty to use batch default fee.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Discount Type
                </label>
                <select
                  value={studentDiscountTypeInput}
                  onChange={(e) =>
                    setStudentDiscountTypeInput(e.target.value as 'NONE' | 'FIXED' | 'PERCENTAGE')
                  }
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="NONE">No Discount</option>
                  <option value="FIXED">FIXED (Amount off)</option>
                  <option value="PERCENTAGE">PERCENTAGE (% off)</option>
                </select>
              </div>

              {studentDiscountTypeInput !== 'NONE' && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Discount Value {studentDiscountTypeInput === 'PERCENTAGE' ? '(%)' : `(${center.currencySymbol})`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={studentDiscountTypeInput === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'}
                    value={studentDiscountValueInput}
                    onChange={(e) => setStudentDiscountValueInput(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Discount Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Merit scholarship, Sibling discount"
                  value={studentDiscountReasonInput}
                  onChange={(e) => setStudentDiscountReasonInput(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-x-2 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={savingStudentFee}
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {savingStudentFee ? 'Saving...' : 'Save Fee Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForFee(null)}
                  className="px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unenroll Confirmation Modal */}
      {unenrollStudentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Confirm Unenrollment</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to unenroll <span className="font-semibold text-foreground">{unenrollStudentTarget.name}</span> from this batch?
            </p>

            {unenrollError && (
              <div className="p-3 bg-red-500/10 text-xs text-red-600 dark:text-red-400 rounded-lg border border-red-500/20">
                {unenrollError}
              </div>
            )}

            <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setUnenrollStudentTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unenrolling}
                onClick={handleUnenrollStudent}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {unenrolling ? 'Unenrolling...' : 'Yes, Unenroll Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

