'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';
import {
  Calendar,
  Award,
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
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

interface PaymentRecord {
  id: string;
  period: string;
  amountDue: number;
  amountPaid: number;
  status: 'DUE' | 'PARTIAL' | 'PAID';
  dueDate?: string | null;
  paidAt?: string | null;
  batch: {
    id: string;
    name: string;
  };
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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.role !== 'GUARDIAN') {
        router.push('/dashboard');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

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

        // Fetch attendance, results, payments in parallel
        const [attRes, resRes, payRes] = await Promise.all([
          apiGet<{ success: boolean; data: AttendanceRecord[] }>(`/api/guardians/students/${studentId}/attendance`),
          apiGet<{ success: boolean; data: TestResultRecord[] }>(`/api/guardians/students/${studentId}/results`),
          apiGet<{ success: boolean; data: PaymentRecord[] }>(`/api/guardians/students/${studentId}/payments`),
        ]);

        if (attRes.success && attRes.data) setAttendance(attRes.data);
        if (resRes.success && resRes.data) setResults(resRes.data);
        if (payRes.success && payRes.data) setPayments(payRes.data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load student performance records');
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

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-700/10">
            PARTIAL
          </span>
        );
      case 'DUE':
        return (
          <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-700/10">
            DUE
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
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading student performance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/my-children" className="hover:text-accent font-medium">My Children</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{studentInfo?.name || 'Child Records'}</span>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {studentInfo?.name || 'Child Details'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Attendance history, exam results, and fee payment records
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 gap-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'attendance'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Attendance ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'results'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="w-4 h-4" /> Test Results ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-sm font-semibold flex items-center gap-x-2 border-b-2 transition ${
              activeTab === 'payments'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Fee Payments ({payments.length})
          </button>
        </div>

        {/* Tab 1: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {attendance.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No attendance records found for this student.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {attendance.map((record) => (
                  <div key={record.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-x-2">
                        <span className="font-bold text-gray-900 text-base">
                          {new Date(record.date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" /> Batch: {record.batch.name}
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {results.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No exam or test result records found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {results.map((res) => (
                  <div key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-base">{res.test.title}</h3>
                      <div className="flex items-center gap-x-3 text-xs text-gray-500 flex-wrap">
                        <span>Batch: <strong className="text-gray-700">{res.test.batch.name}</strong></span>
                        <span>•</span>
                        <span>Type: <span className="uppercase font-semibold text-gray-700">{res.test.type}</span></span>
                        <span>•</span>
                        <span>Submitted: {new Date(res.submittedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-4 shrink-0">
                      {res.rank && (
                        <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-700/10">
                          Rank #{res.rank}
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-accent">
                          {res.totalMarksObtained}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold"> / {res.test.totalMarks} marks</span>
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No fee payment records found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-x-3">
                        <h3 className="font-bold text-gray-900 text-base">Period: {p.period}</h3>
                        {getPaymentBadge(p.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Batch: <strong className="text-gray-700">{p.batch.name}</strong>
                      </p>
                      {p.paidAt && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Paid on: {new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-sm font-semibold text-gray-500">
                        Due: ৳{p.amountDue}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        Paid: <span className="text-emerald-600">৳{p.amountPaid}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
