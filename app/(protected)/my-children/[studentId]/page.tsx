'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { formatDate, formatMoney } from '@/lib/format';
import {
  Calendar,
  Award,
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  FileText,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  batch: {
    id: string;
    name: string;
    type: string;
  };
}

interface TestResultRecord {
  id: string;
  totalMarksObtained: number;
  rank?: number | null;
  submittedAt: string;
  test: {
    id: string;
    title: string;
    type: string;
    totalMarks: number;
    testDate: string;
    batch: {
      id: string;
      name: string;
    };
  };
}

interface LedgerPaymentItem {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: string;
  method: string;
  reference?: string | null;
  isReversed: boolean;
  allocations: Array<{
    chargeId: string;
    chargeDescription: string;
    period: string;
    amount: string;
  }>;
}

interface LedgerChargeItem {
  id: string;
  batchName: string;
  kind: string;
  period: string;
  description: string;
  dueDate: string;
  effectiveAmount: string;
  paidAmount: string;
  balance: string;
  status: string;
}

interface FeeAccountStatement {
  summary?: {
    totalCharges?: string;
    totalEffective?: string;
    totalPaid?: string;
    totalOutstanding?: string;
    unallocatedCredit?: string;
  };
  charges?: LedgerChargeItem[];
  payments?: LedgerPaymentItem[];
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default function ChildDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { studentId } = use(params);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'results' | 'payments'>('attendance');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<TestResultRecord[]>([]);
  const [feeAccount, setFeeAccount] = useState<FeeAccountStatement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'GUARDIAN') {
        router.push('/dashboard');
        return;
      }
      loadChildData();
    }
    init();

    async function loadChildData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch student name from my-students list
        const myStudentsRes = await apiGet<{ success: boolean; data: StudentInfo[] }>('/api/guardians/my-students')
          .catch(() => ({ success: false, data: [] }));
        if (myStudentsRes.success && myStudentsRes.data) {
          const match = myStudentsRes.data.find((s) => s.id === studentId);
          if (match) setStudentInfo(match);
        }

        // Fetch attendance, results, fees account in parallel
        const [attRes, resRes, feeRes] = await Promise.all([
          apiGet<{ success: boolean; data: AttendanceRecord[] }>(`/api/guardians/students/${studentId}/attendance`),
          apiGet<{ success: boolean; data: TestResultRecord[] }>(`/api/guardians/students/${studentId}/results`),
          apiGet<{ success: boolean; data: FeeAccountStatement }>(`/api/fees/guardian/students/${studentId}/account`),
        ]);

        if (attRes.success && attRes.data) setAttendance(attRes.data);
        if (resRes.success && resRes.data) setResults(resRes.data);
        if (feeRes.success && feeRes.data) setFeeAccount(feeRes.data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load student performance records');
      } finally {
        setLoading(false);
      }
    }

    loadChildData();
  }, [studentId, router]);

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-x-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
            <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-x-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-700/10">
            <XCircle className="w-3.5 h-3.5" /> ABSENT
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-x-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-700/10">
            <Clock className="w-3.5 h-3.5" /> LATE
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading student performance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-muted-foreground gap-x-2">
          <Link href="/my-children" className="hover:text-primary font-medium">My Children</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{studentInfo?.name || 'Child Records'}</span>
        </nav>

        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {studentInfo?.name || 'Child Details'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Attendance history, exam results, and fee payment records
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'attendance'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" /> Attendance ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'results'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-4 h-4" /> Test Results ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'payments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Fee Payments ({feeAccount?.payments?.length || 0})
          </button>
        </div>

        {/* Tab 1: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
            {attendance.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No attendance records found for this student.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {attendance.map((record) => (
                  <div key={record.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-x-2">
                        <span className="font-bold text-foreground text-base">
                          {formatDate(record.date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> Batch: {record.batch.name}
                      </p>
                    </div>
                    {getAttendanceBadge(record.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Test Results */}
        {activeTab === 'results' && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
            {results.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No exam or test result records found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((res) => (
                  <div key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground text-base">{res.test.title}</h3>
                      <div className="flex items-center gap-x-3 text-xs text-muted-foreground flex-wrap">
                        <span>Batch: <strong className="text-foreground">{res.test.batch.name}</strong></span>
                        <span>•</span>
                        <span>Type: <span className="uppercase font-semibold text-foreground">{res.test.type}</span></span>
                        <span>•</span>
                        <span>Submitted: {formatDate(res.submittedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-4 shrink-0">
                      {res.rank && (
                        <span className="inline-flex items-center rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                          Rank #{res.rank}
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-primary">
                          {res.totalMarksObtained}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold"> / {res.test.totalMarks} marks</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payment History */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {feeAccount?.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Total Paid</span>
                  <p className="text-xl font-extrabold text-foreground mt-1">
                    {formatMoney(feeAccount.summary.totalPaid || '0.00')}
                  </p>
                </div>
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Outstanding Balance</span>
                  <p className="text-xl font-extrabold text-foreground mt-1">
                    {formatMoney(feeAccount.summary.totalOutstanding || '0.00')}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
              {(!feeAccount?.payments || feeAccount.payments.length === 0) ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No fee payment records found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {feeAccount.payments.map((p) => (
                    <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-x-3">
                          <h3 className="font-bold text-foreground text-base">Receipt #{p.receiptNumber}</h3>
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                              p.isReversed
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-600/20'
                                : 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-600/20'
                            }`}
                          >
                            {p.isReversed ? 'REVERSED' : 'PAID'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Method: <strong className="text-foreground">{p.method}</strong>
                          {p.reference && <span> • Ref: {p.reference}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          Paid on: {formatDate(p.receivedAt)}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-muted-foreground">Amount Paid</div>
                          <div className="text-lg font-bold text-foreground">{formatMoney(p.amount)}</div>
                        </div>
                        <Link
                          href={`/fees/receipts/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-hover hover:bg-surface border border-border text-foreground transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Receipt
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
