import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AdmissionsClient from './admissions-client';

export const metadata = {
  title: 'Admissions & Enquiry Pipeline | EduFlow',
  description: 'Manage prospect pipeline, follow-ups, notes, and student conversion',
};

export default async function AdmissionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdmissionsClient
          currentUserRole={currentUser.role}
          currentUserBranchId={currentUser.branchId}
        />
      </div>
    </div>
  );
}

