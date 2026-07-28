import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import StudentsTable, { StudentSummary } from './students-table';

export default async function StudentsPage() {
  const user = await getCurrentUser();

  // Enforce ADMIN or TEACHER role access only
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    redirect('/dashboard');
  }

  let students: StudentSummary[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await apiGet<{ success: boolean; data: StudentSummary[] }>('/api/students/summary', {
      headers: {
        Cookie: cookieHeader,
      },
      next: { revalidate: 0 },
    });

    if (response && response.success) {
      students = response.data;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load students summary';
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <StudentsTable
      initialStudents={students}
      errorMsg={errorMsg}
      isAdmin={isAdmin}
    />
  );
}
