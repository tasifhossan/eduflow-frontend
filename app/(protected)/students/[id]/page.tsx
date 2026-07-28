import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';

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

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  createdAt: string;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const user = await getCurrentUser();

  // Enforce ADMIN or TEACHER role access only
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    redirect('/dashboard');
  }

  // Resolve params
  const resolvedParams = await params;
  const studentId = resolvedParams.id;

  let studentProfile: StudentSummary | null = null;
  let enrolledBatches: Batch[] = [];
  let attendanceHistory: AttendanceRecord[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // 1. Fetch profile details by querying student summaries and matching the ID
    const summaryResponse = await apiGet<{ success: boolean; data: StudentSummary[] }>('/api/students/summary', {
      headers: { Cookie: cookieHeader },
    });

    if (summaryResponse && summaryResponse.success) {
      studentProfile = summaryResponse.data.find((s) => s.id === studentId) || null;
    }

    if (!studentProfile) {
      errorMsg = 'Student profile not found in your branch';
    } else {
      // 2. Fetch enrolled batches
      const batchesResponse = await apiGet<{ success: boolean; data: Batch[] }>(
        `/api/enrollments/students/${studentId}/batches`,
        { headers: { Cookie: cookieHeader } }
      );
      if (batchesResponse && batchesResponse.success) {
        enrolledBatches = batchesResponse.data;
      }

      // 3. Fetch attendance history
      const attendanceResponse = await apiGet<{ success: boolean; data: AttendanceRecord[] }>(
        `/api/students/${studentId}/attendance`,
        { headers: { Cookie: cookieHeader } }
      );
      if (attendanceResponse && attendanceResponse.success) {
        attendanceHistory = attendanceResponse.data;
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load student details';
  }

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
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Name</span>
                    <span className="text-sm font-medium text-gray-900 font-poppins">
                      {studentProfile.guardianName || <span className="text-gray-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Phone</span>
                    <span className="text-sm font-medium text-gray-900">
                      {studentProfile.guardianPhone || <span className="text-gray-400 italic">Not provided</span>}
                    </span>
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
                </div>
              </div>
            </div>

            {/* Right Column: Enrolled Batches & Attendance History */}
            <div className="space-y-8 lg:col-span-2">
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
