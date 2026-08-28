'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/client-auth';

interface Subject {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
}

export default function NewBatchPage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'ACADEMIC' | 'ADMISSION'>('ACADEMIC');
  const [classLevel, setClassLevel] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authorization Check
  useEffect(() => {
    const token = getToken();
    console.error('DEBUG: token found in /batches/new page:', token);

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.error('DEBUG: payload decoded in /batches/new:', payload);
        if (payload.role !== 'ADMIN') {
          console.error('DEBUG: payload role is not ADMIN, pushing to /batches');
          router.push('/batches');
        }
      } catch (err) {
        console.error('DEBUG: JSON parse or atob failed in /batches/new page:', err);
        router.push('/login');
      }
    } else {
      console.error('DEBUG: no token found in /batches/new, pushing to /login');
      router.push('/login');
    }
  }, [router]);

  // Fetch subjects and teachers
  useEffect(() => {
    async function loadData() {
      try {
        // Attempt fetching subjects
        const subjRes = await apiGet<{ success: boolean; data: Subject[] }>('/api/subjects')
          .catch(() => ({ success: false, data: [] }));
        
        if (subjRes.success && subjRes.data.length > 0) {
          setSubjects(subjRes.data);
        } else {
          // Mock subjects fallback
          setSubjects([
            { id: 'sub-phy', name: 'Physics' },
            { id: 'sub-chem', name: 'Chemistry' },
            { id: 'sub-math', name: 'Mathematics' },
            { id: 'sub-bio', name: 'Biology' },
            { id: 'sub-eng', name: 'English' },
          ]);
        }

        // Attempt fetching teachers
        const teachRes = await apiGet<{ success: boolean; data: Teacher[] }>('/api/users?role=TEACHER')
          .catch(() => ({ success: false, data: [] }));

        if (teachRes.success && teachRes.data.length > 0) {
          setTeachers(teachRes.data);
        } else {
          // Mock teachers fallback
          setTeachers([
            { id: 'usr-teach1', name: 'Dr. Rafiqul Islam' },
            { id: 'usr-teach2', name: 'Ms. Farhana Yasmin' },
            { id: 'usr-teach3', name: 'Mr. Tanvir Rahman' },
          ]);
        }
      } catch (err) {
        console.warn('Failed to load subjects or teachers, using mock fallbacks');
      } finally {
        setLoadingLists(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setErrorMsg('Batch name is required');
      return;
    }
    if (!subjectId) {
      setErrorMsg('Please select a subject');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        type,
        classLevel: classLevel.trim() || undefined,
        subjectId,
        teacherId: teacherId || undefined,
      };

      const response = await apiPost('/api/batches', payload);
      if (response && response.success) {
        router.push('/batches');
        router.refresh();
      } else {
        setErrorMsg(response.message || 'Failed to create batch');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">New Batch</span>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Batch</h1>
          <p className="mt-2 text-sm text-gray-500">Configure details for a new coaching class cohort</p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {loadingLists ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">Loading form options...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Batch Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Batch Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., HSC 2026 Physics Special"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              />
            </div>

            {/* Type & Class Level */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-gray-900 mb-2">
                  Batch Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'ACADEMIC' | 'ADMISSION')}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="ADMISSION">Admission</option>
                </select>
              </div>

              <div>
                <label htmlFor="classLevel" className="block text-sm font-semibold text-gray-900 mb-2">
                  Class Level (Optional)
                </label>
                <input
                  type="text"
                  id="classLevel"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  placeholder="e.g., Class 11, HSC"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subjectId" className="block text-sm font-semibold text-gray-900 mb-2">
                Subject
              </label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher */}
            <div>
              <label htmlFor="teacherId" className="block text-sm font-semibold text-gray-900 mb-2">
                Assigned Teacher (Optional)
              </label>
              <select
                id="teacherId"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm"
              >
                <option value="">Unassigned</option>
                {teachers.map((teach) => (
                  <option key={teach.id} value={teach.id}>
                    {teach.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-x-4 border-t border-gray-100 pt-6">
              <Link
                href="/batches"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
