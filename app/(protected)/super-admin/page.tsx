'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface BranchBreakdownItem {
  branchId: string;
  branchName: string;
  address: string | null;
  studentCount: number;
  batchCount: number;
  totalRevenue: number;
}

interface SuperAdminDashboardData {
  totalBranches: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  overallAttendanceRate: number;
  branchBreakdown: BranchBreakdownItem[];
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiGet<{ success: boolean; data: SuperAdminDashboardData }>(
          '/api/dashboard/super-admin'
        );
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setErrorMsg('Failed to load super admin dashboard data.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading cross-branch dashboard...</span>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Super Admin Dashboard</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg || 'Access denied or failed to load data.'}</p>
        </div>
        <Link href="/dashboard" className="text-accent hover:underline text-sm font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const { totalBranches, totalStudents, totalTeachers, totalRevenue, overallAttendanceRate, branchBreakdown } = data;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
        <div>
          <span className="inline-flex items-center rounded-md bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent uppercase tracking-wider mb-1">
            System Overseer
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cross-Branch Master Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Real-time aggregate performance metrics across all branches</p>
        </div>
        <Link
          href="/branches"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 transition"
        >
          Manage Branches &rarr;
        </Link>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Branches</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalBranches}</p>
          <p className="text-xs text-gray-500 mt-1">Active locations</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Active Students</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalStudents}</p>
          <p className="text-xs text-gray-500 mt-1">Enrolled across branches</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Teachers</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalTeachers}</p>
          <p className="text-xs text-gray-500 mt-1">Teaching staff</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">৳{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Collected fee payments</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall Attendance</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{overallAttendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Overall presence rate</p>
        </div>
      </div>

      {/* Per-Branch Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Branch Financial & Roster Breakdown</h2>
            <p className="text-xs text-gray-500">Overview of student counts, batches, and total revenue per branch</p>
          </div>
        </div>

        {branchBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-10 text-center">No branches found in system.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Branch Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Address</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Students</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Batches</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branchBreakdown.map((b) => (
                  <tr key={b.branchId} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{b.branchName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{b.address || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">{b.studentCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">{b.batchCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-600">
                      ৳{b.totalRevenue.toLocaleString()}
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
