'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';
import {
  Users,
  Loader2,
  ChevronRight,
  BookOpen,
  Mail,
  Phone,
} from 'lucide-react';

interface EnrolledBatch {
  id: string;
  name: string;
  type: string;
  classLevel?: string | null;
}

interface Enrollment {
  batch: EnrolledBatch;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  enrollments?: Enrollment[];
}

export default function MyChildrenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
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

    async function loadLinkedStudents() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await apiGet<{ success: boolean; data: Student[] }>('/api/guardians/my-students');
        if (res.success && res.data) {
          setStudents(res.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load linked students');
      } finally {
        setLoading(false);
      }
    }

    loadLinkedStudents();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading your linked children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center gap-x-3">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                My Children
              </h1>
              <p className="text-sm text-gray-500">
                Select a child to view their attendance, exam results, and fee payments
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No linked children found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              You are not currently linked to any student records. Please contact your coaching center administrator to link your account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-x-3">
                      <div className="w-12 h-12 rounded-full bg-accent text-white font-bold flex items-center justify-center text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                        <p className="text-xs text-gray-500 flex items-center gap-x-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {student.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {student.phone && (
                    <p className="text-xs text-gray-600 flex items-center gap-x-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {student.phone}
                    </p>
                  )}

                  {/* Enrolled Batches */}
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Enrolled Batches
                    </span>
                    {student.enrollments && student.enrollments.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {student.enrollments.map((e) => (
                          <span
                            key={e.batch.id}
                            className="inline-flex items-center gap-x-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/10"
                          >
                            <BookOpen className="w-3 h-3" /> {e.batch.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No active batch enrollments</span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/my-children/${student.id}`}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition gap-x-2 pt-2"
                >
                  View Performance & Records <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
