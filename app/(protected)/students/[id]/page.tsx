import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import StudentEditControls from '@/components/student-edit-controls';
import UnlinkGuardianButton from '@/components/unlink-guardian-button';
import PracticeWeakSpotCard from '@/components/practice-weak-spot-card';


interface Batch {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  subject?: {
    name: string;
  } | null;
  teacher?: {
    name: string;
  } | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  batch: {
    name: string;
  };
}

interface LinkedGuardian {
  linkId?: string;
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  linkedGuardians?: LinkedGuardian[];
  createdAt: string;
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
  notes?: string | null;
  createdAt: string;
  batch: {
    id: string;
    name: string;
    type?: string;
  };
}

interface TrendEntry {
  testId: string;
  testName: string;
  testDate: string;
  submittedAt: string;
  totalMarks: number;
  score: number;
  percentage: number | null;
  rank: number | null;
  batchName?: string;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/dashboard');
  }

  // Resolve params
  const resolvedParams = await params;
  const studentId = resolvedParams.id;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const isOwnProfile = user.role === 'STUDENT' && user.id === studentId;

  let isLinkedChild = false;
  let linkedChildInfo: StudentSummary | null = null;

  if (user.role === 'GUARDIAN') {
    const myStudentsRes = await apiGet<{ success: boolean; data: StudentSummary[] }>(
      '/api/guardians/my-students',
      { headers: { Cookie: cookieHeader } }
    ).catch(() => null);

    if (myStudentsRes && myStudentsRes.success && Array.isArray(myStudentsRes.data)) {
      const match = myStudentsRes.data.find((s) => s.id === studentId);
      if (match) {
        isLinkedChild = true;
        linkedChildInfo = match;
      }
    }
  }

  // Enforce access control rules:
  // 1. ADMIN, TEACHER, SUPER_ADMIN can view any student profile.
  // 2. GUARDIAN can only view their linked children's profile page.
  // 3. STUDENT can only view their own profile page.
  if (user.role === 'STUDENT' && !isOwnProfile) {
    redirect('/dashboard');
  }

  if (user.role === 'GUARDIAN' && !isLinkedChild) {
    redirect('/my-children');
  }

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'TEACHER' &&
    user.role !== 'SUPER_ADMIN' &&
    user.role !== 'GUARDIAN' &&
    !isOwnProfile
  ) {
    redirect('/dashboard');
  }

  let studentProfile: StudentSummary | null = null;
  let enrolledBatches: Batch[] = [];
  let attendanceHistory: AttendanceRecord[] = [];
  let paymentHistory: FeePayment[] = [];
  let scoreTrend: TrendEntry[] = [];
  let errorMsg: string | null = null;

  try {
    // 1. Fetch profile details
    if (user.role === 'ADMIN' || user.role === 'TEACHER' || user.role === 'SUPER_ADMIN') {
      const summaryResponse = await apiGet<{ success: boolean; data: StudentSummary[] }>(
        '/api/students/summary',
        { headers: { Cookie: cookieHeader } }
      ).catch(() => null);

      if (summaryResponse && summaryResponse.success) {
        studentProfile = summaryResponse.data.find((s) => s.id === studentId) || null;
      }
    } else if (isOwnProfile) {
      studentProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || null,
        guardianName: (user as any).guardianName || null,
        guardianPhone: (user as any).guardianPhone || null,
        createdAt: (user as any).createdAt || new Date().toISOString(),
      };
    } else if (isLinkedChild && linkedChildInfo) {
      studentProfile = {
        id: linkedChildInfo.id,
        name: linkedChildInfo.name,
        email: linkedChildInfo.email,
        phone: linkedChildInfo.phone || null,
        guardianName: linkedChildInfo.guardianName || null,
        guardianPhone: linkedChildInfo.guardianPhone || null,
        createdAt: linkedChildInfo.createdAt || new Date().toISOString(),
      };
    }

    if (!studentProfile) {
      errorMsg = 'Student profile not found in your branch or access denied';
    } else {
      if (user.role === 'GUARDIAN') {
        // Fetch guardian linked child data
        const [attRes, resRes, payRes] = await Promise.all([
          apiGet<{ success: boolean; data: any[] }>(
            `/api/guardians/students/${studentId}/attendance`,
            { headers: { Cookie: cookieHeader } }
          ).catch(() => ({ success: false, data: [] })),
          apiGet<{ success: boolean; data: any[] }>(
            `/api/guardians/students/${studentId}/results`,
            { headers: { Cookie: cookieHeader } }
          ).catch(() => ({ success: false, data: [] })),
          apiGet<{ success: boolean; data: any[] }>(
            `/api/guardians/students/${studentId}/payments`,
            { headers: { Cookie: cookieHeader } }
          ).catch(() => ({ success: false, data: [] })),
        ]);

        if (attRes.success && attRes.data) {
          attendanceHistory = attRes.data.map((r) => ({
            id: r.id,
            date: r.date,
            status: r.status,
            batch: { name: r.batch?.name || 'Batch' },
          }));
        }

        if (resRes.success && resRes.data) {
          scoreTrend = resRes.data.map((r) => ({
            testId: r.test?.id || r.id,
            testName: r.test?.title || 'Test',
            testDate: r.test?.testDate || r.submittedAt,
            submittedAt: r.submittedAt,
            totalMarks: r.test?.totalMarks || 100,
            score: r.totalMarksObtained,
            percentage:
              r.test?.totalMarks > 0
                ? parseFloat(((r.totalMarksObtained / r.test.totalMarks) * 100).toFixed(2))
                : null,
            rank: r.rank || null,
            batchName: r.test?.batch?.name || 'Batch',
          }));
        }

        if (payRes.success && payRes.data) {
          paymentHistory = payRes.data.map((p) => ({
            id: p.id,
            studentId,
            batchId: p.batch?.id || '',
            period: p.period,
            amountDue: p.amountDue,
            amountPaid: p.amountPaid,
            status: p.status,
            dueDate: p.dueDate,
            paidAt: p.paidAt,
            createdAt: p.createdAt || new Date().toISOString(),
            batch: { id: p.batch?.id || '', name: p.batch?.name || 'Batch' },
          }));
        }
      } else {
        // ADMIN / TEACHER / STUDENT
        const batchesResponse = await apiGet<{ success: boolean; data: Batch[] }>(
          `/api/students/${studentId}/batches`,
          { headers: { Cookie: cookieHeader } }
        ).catch(() => null);

        if (batchesResponse && batchesResponse.success) {
          enrolledBatches = batchesResponse.data;
        }

        const attendanceResponse = await apiGet<{ success: boolean; data: AttendanceRecord[] }>(
          `/api/students/${studentId}/attendance`,
          { headers: { Cookie: cookieHeader } }
        ).catch(() => null);

        if (attendanceResponse && attendanceResponse.success) {
          attendanceHistory = attendanceResponse.data;
        }

        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          const paymentsResponse = await apiGet<{ success: boolean; data: FeePayment[] }>(
            `/api/students/${studentId}/payments`,
            { headers: { Cookie: cookieHeader } }
          ).catch(() => null);

          if (paymentsResponse && paymentsResponse.success) {
            paymentHistory = paymentsResponse.data;
          }
        }

        if (enrolledBatches.length > 0) {
          const trendResults = await Promise.all(
            enrolledBatches.map((batch) =>
              apiGet<{ success: boolean; data: { trend: TrendEntry[] } }>(
                `/api/batches/${batch.id}/students/${studentId}/trend`,
                { headers: { Cookie: cookieHeader } }
              )
                .then((res) =>
                  res.success && res.data
                    ? res.data.trend.map((e) => ({ ...e, batchName: batch.name }))
                    : []
                )
                .catch(() => [])
            )
          );
          scoreTrend = trendResults
            .flat()
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        }
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load student details';
  }

  // Summary totals for payment history
  const totalPaidAcrossBatches = paymentHistory.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = paymentHistory
    .filter((p) => p.status !== 'PAID')
    .reduce((sum, p) => sum + Math.max(0, p.amountDue - p.amountPaid), 0);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div className="space-y-1">
            <nav className="flex text-sm text-gray-500 gap-x-2">
              <Link href="/students" className="hover:text-accent font-medium">Students</Link>
              <span>/</span>
              <span className="text-gray-900 font-semibold">{studentProfile?.name || 'Student Profile'}</span>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {studentProfile ? `${studentProfile.name}'s Profile` : 'Student Details'}
            </h1>
          </div>
          <Link
            href="/students"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Back to List
          </Link>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {studentProfile && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column: Student Profile Details Card */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center text-accent text-3xl font-bold mb-4">
                    {studentProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{studentProfile.name}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">ID: {studentProfile.id}</p>
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</span>
                    <span className="text-sm font-medium text-gray-900">{studentProfile.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone Number</span>
                    <span className="text-sm font-medium text-gray-900">
                      {studentProfile.phone || <span className="text-gray-400 italic">No phone recorded</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Contact Name</span>
                    <span className="text-sm font-medium text-gray-900 font-poppins">
                      {studentProfile.guardianName || <span className="text-gray-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Contact Phone</span>
                    <span className="text-sm font-medium text-gray-900">
                      {studentProfile.guardianPhone || <span className="text-gray-400 italic">Not provided</span>}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Linked Guardian Accounts
                      </span>
                    </div>
                    {studentProfile.linkedGuardians && studentProfile.linkedGuardians.length > 0 ? (
                      <div className="space-y-2">
                        {studentProfile.linkedGuardians.map((g) => (
                          <div
                            key={g.id}
                            className="rounded-xl bg-purple-50/80 p-3 border border-purple-100 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-purple-900 text-sm">{g.name}</span>
                              {user.role === 'ADMIN' && g.linkId && (
                                <UnlinkGuardianButton linkId={g.linkId} guardianName={g.name} />
                              )}
                            </div>
                            <span className="text-purple-700 block font-medium">{g.email}</span>
                            {g.phone && <span className="text-purple-600 block">{g.phone}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No portal login account linked</span>
                    )}
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Admission Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(studentProfile.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <StudentEditControls student={studentProfile} isAdmin={user.role === 'ADMIN'} />
                </div>
              </div>
            </div>

            {/* Right Column: Practice Card (own profile), Enrolled Batches, Payment History (ADMIN), & Attendance History */}
            <div className="space-y-8 lg:col-span-2">
              {/* Practice Weak Chapters Card (Only rendered when student is viewing their own profile) */}
              {isOwnProfile && (
                <PracticeWeakSpotCard studentId={studentId} enrolledBatches={enrolledBatches} />
              )}

              {/* Enrolled Batches */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">
                  Enrolled Batches ({enrolledBatches.length})
                </h3>

                {enrolledBatches.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-4 text-center">
                    This student is not enrolled in any batches yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {enrolledBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/batches/${batch.id}`}
                            className="text-sm font-semibold text-accent hover:underline font-poppins"
                          >
                            {batch.name}
                          </Link>
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                              batch.type === 'ACADEMIC'
                                ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                : 'bg-amber-50 text-amber-700 ring-amber-700/10'
                            }`}
                          >
                            {batch.type}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <p>
                            <span className="font-semibold text-gray-700">Subject:</span>{' '}
                            {batch.subject?.name || 'N/A'}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-700">Teacher:</span>{' '}
                            {batch.teacher?.name || <span className="italic">Unassigned</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History (ADMIN Only) */}
              {user.role === 'ADMIN' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
                      <p className="text-xs text-gray-500">All payment records across enrolled batches</p>
                    </div>

                    {/* Summary Totals */}
                    <div className="flex gap-x-4 text-xs font-semibold">
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] text-emerald-600 uppercase block font-bold">Total Paid</span>
                        <span className="text-sm font-extrabold">৳{totalPaidAcrossBatches.toLocaleString()}</span>
                      </div>
                      <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] text-amber-600 uppercase block font-bold">Outstanding</span>
                        <span className="text-sm font-extrabold">৳{totalOutstanding.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {paymentHistory.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-10 text-center bg-white">
                      No payment records found for this student.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Batch Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Period
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Amount Due
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Amount Paid
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Due Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Paid At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentHistory.map((payment) => (
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
                                {payment.dueDate
                                  ? new Date(payment.dueDate).toLocaleDateString()
                                  : <span className="text-gray-400 italic">N/A</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                {payment.paidAt
                                  ? new Date(payment.paidAt).toLocaleDateString()
                                  : <span className="text-gray-400 italic">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Score Trend */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Score Trend</h3>
                  <p className="text-xs text-gray-500">Chronological test results across all enrolled batches</p>
                </div>

                {scoreTrend.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-10 text-center bg-white">
                    No test results found for this student yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Test Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Batch</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">%</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Rank</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {scoreTrend.map((entry) => (
                          <tr key={`${entry.testId}`} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{entry.testName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{entry.batchName || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                              {new Date(entry.testDate).toLocaleDateString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-gray-900">
                              {entry.score} / {entry.totalMarks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                  entry.percentage === null
                                    ? 'bg-gray-50 text-gray-600 ring-gray-500/10'
                                    : entry.percentage < 50
                                    ? 'bg-red-50 text-red-700 ring-red-600/20'
                                    : entry.percentage < 70
                                    ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                    : 'bg-green-50 text-green-700 ring-green-600/20'
                                }`}
                              >
                                {entry.percentage !== null ? `${entry.percentage}%` : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                              {entry.rank !== null ? `#${entry.rank}` : <span className="text-gray-400 italic">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Attendance History */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
                </div>

                {attendanceHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-10 text-center bg-white">
                    No attendance records found for this student.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                          >
                            Batch
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceHistory.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {new Date(record.date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.batch.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                  record.status === 'PRESENT'
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : record.status === 'ABSENT'
                                    ? 'bg-red-50 text-red-700 ring-red-600/20'
                                    : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    record.status === 'PRESENT'
                                      ? 'bg-green-600'
                                      : record.status === 'ABSENT'
                                      ? 'bg-red-600'
                                      : 'bg-amber-600'
                                  }`}
                                />
                                {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
