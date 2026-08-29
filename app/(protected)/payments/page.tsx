'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';

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
  notes?: string | null;
  createdAt: string;
  batch: {
    id: string;
    name: string;
    type?: string;
  };
}

export default function MyPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role validation & data load
  useEffect(() => {
    const token = getToken();

    if (token) {
      const payload = parseJwt(token);
      if (!payload || payload.role !== 'STUDENT') {
        // Redirect ADMIN / TEACHER away from this student-only page
        router.push('/dashboard');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    async function loadMyPayments() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const response = await apiGet<{ success: boolean; data: FeePayment[] }>('/api/payments/my-payments');
        if (response && response.success && response.data) {
          setPayments(response.data);
        } else {
          setErrorMsg('Failed to retrieve payment records');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while loading payment history');
      } finally {
        setLoading(false);
      }
    }

    loadMyPayments();
  }, [router]);

  // Calculate Summary Totals
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = payments
    .filter((p) => p.status !== 'PAID')
    .reduce((sum, p) => sum + Math.max(0, p.amountDue - p.amountPaid), 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading payment history...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-3">
        <div>
          <nav className="flex text-sm text-gray-500 gap-x-2 mb-1">
            <Link href="/dashboard" className="hover:text-accent font-medium">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">My Payments</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Fee Payments</h1>
          <p className="mt-1 text-sm text-gray-500">View your payment history and outstanding fee details across all batches</p>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600">
            <span className="font-semibold text-red-800">Error:</span> {errorMsg}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Total Amount Paid</span>
            <div className="mt-2 text-3xl font-extrabold text-emerald-700">৳{totalPaid.toLocaleString()}</div>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold">
            ✓
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">Total Outstanding Due</span>
            <div className="mt-2 text-3xl font-extrabold text-amber-700">৳{totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold">
            !
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Payment Records ({payments.length})</h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm font-medium">No payment history found</p>
            <p className="text-xs text-gray-400 mt-1">You have no active fee or installment records assigned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Batch Name</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Period</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount Due</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount Paid</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      {payment.batch?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-mono text-xs">
                      {payment.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ৳{payment.amountDue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ৳{payment.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          payment.status === 'PAID'
                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                            : payment.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                            : 'bg-red-50 text-red-700 ring-red-600/20'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : <span className="text-gray-400 italic">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
