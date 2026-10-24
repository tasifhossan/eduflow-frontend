import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import UsersManagementClient from './users-management';

export const metadata = {
  title: 'User Management & Provisioning | EduFlow',
  description: 'Staff provisioning, account lifecycle, password resets, and bulk import',
};

export default async function UsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <UsersManagementClient
          currentUserRole={currentUser.role}
          currentUserBranchId={currentUser.branchId}
        />
      </div>
    </div>
  );
}
