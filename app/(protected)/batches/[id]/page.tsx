'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

interface BatchDetails {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  // States
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Role check and initial data load
  useEffect(() => {
    const token = getToken();

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN' && payload.role !== 'TEACHER') {
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

    async function loadBatchData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Fetch batch details
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success) {
          setBatch(batchRes.data);
        }

        // 2. Fetch enrolled students safely
        const enrolledRes = await apiGet<{ success: boolean; data: Student[] }>(`/api/batches/${batchId}/students`)
          .catch(() => ({ success: false, data: [] }));
        if (enrolledRes.success && enrolledRes.data) {
          setEnrolledStudents(enrolledRes.data);
        }

        // 3. Fetch all branch students for enrollment list
        const studentsRes = await apiGet<{ success: boolean; data: Student[] }>('/api/users?role=STUDENT')
          .catch(() => ({ success: false, data: [] }));

        if (studentsRes.success && studentsRes.data.length > 0) {
          setAvailableStudents(studentsRes.data);
        } else {
          // Fallback to mock students
          setAvailableStudents([
            { id: 'usr-stud1', name: 'Tasif Hossain', email: 'tasif@gmail.com', phone: '01712345678', guardianName: 'Mr. Hossain', guardianPhone: '01711111111' },
            { id: 'usr-stud2', name: 'Imran Khan', email: 'imran@gmail.com', phone: '01812345678', guardianName: 'Mr. Khan', guardianPhone: '01811111111' },
            { id: 'usr-stud3', name: 'Nusrat Jahan', email: 'nusrat@gmail.com', phone: '01912345678', guardianName: 'Mr. Jahan', guardianPhone: '01911111111' },
            { id: 'usr-stud4', name: 'Afsana Mimi', email: 'afsana@gmail.com', phone: '01512345678', guardianName: 'Mr. Mimi', guardianPhone: '01511111111' },
          ]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load batch details');
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
        if (enrolledRes.success) {
          setEnrolledStudents(enrolledRes.data);
        }
      } else {
        setEnrollError(response.message || 'Failed to enroll student');
      }
    } catch (err: any) {
      setEnrollError(err.message || 'An error occurred during enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
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
        <Link href="/batches" className="text-accent hover:underline text-sm font-medium">
          &larr; Back to batches list
        </Link>
      </div>
    );
  }

  // Filter out students who are already enrolled in this batch
  const nonEnrolledStudents = availableStudents.filter(
    (student) => !enrolledStudents.some((enrolled) => enrolled.id === student.id)
  );

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{batch.name}</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{batch.name}</h1>
            <p className="mt-2 text-sm text-gray-500">Batch details, routines, attendance, and student list</p>
          </div>
          {/* Quick Links */}
          <div className="flex gap-x-3">
            <Link
              href={`/batches/${batchId}/routine`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Class Routine
            </Link>
            <Link
              href={`/batches/${batchId}/attendance`}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              Mark Attendance
            </Link>
          </div>
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Enrollment */}
          <div className="space-y-6 lg:col-span-1">
            {/* Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Batch Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 font-medium block">Type</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 mt-0.5 text-xs font-semibold ring-1 ring-inset ${
                    batch.type === 'ACADEMIC'
                      ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                      : 'bg-amber-50 text-amber-700 ring-amber-700/10'
                  }`}>
                    {batch.type}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Class Level</span>
                  <span className="text-gray-900 font-semibold">{batch.classLevel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Subject</span>
                  <span className="text-gray-900 font-semibold">{batch.subject.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Assigned Teacher</span>
                  <span className="text-gray-900 font-semibold">
                    {batch.teacher?.name || <span className="text-gray-400 italic font-normal">Unassigned</span>}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Total Enrolled</span>
                  <span className="text-gray-900 font-semibold">{enrolledStudents.length} Students</span>
                </div>
              </div>
            </div>

            {/* Enroll Form Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Enroll Student</h2>

              {enrollError && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-600">
                  {enrollError}
                </div>
              )}
              {enrollSuccess && (
                <div className="rounded-md bg-green-50 p-3 border border-green-200 text-xs text-green-600">
                  {enrollSuccess}
                </div>
              )}

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label htmlFor="studentSelect" className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Select student from branch list
                  </label>
                  {nonEnrolledStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No additional students available in the branch list.</p>
                  ) : (
                    <select
                      id="studentSelect"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent text-sm"
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
                  className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Enrolled Students List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Enrolled Students</h2>
                <p className="text-xs text-gray-500 mt-1">Students registered and active in this batch</p>
              </div>

              {enrolledStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                  </svg>
                  <p className="mt-4 text-sm font-medium">No students enrolled yet</p>
                  <p className="text-xs text-gray-400">Use the enrollment panel to add students to this class.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student Info</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Guardian Name</th>
                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Guardian Phone</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {enrolledStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {student.phone || <span className="text-gray-400 italic">None</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {student.guardianName || <span className="text-gray-400 italic">None</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {student.guardianPhone || <span className="text-gray-400 italic">None</span>}
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
      </div>
    </div>
  );
}
