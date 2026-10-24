import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuditLogsClient from './audit-logs-client';

export const metadata = {
  title: 'Audit Logs | EduFlow',
  description: 'Security, authentication, and provisioning activity audit trail',
};

export default async function AuditLogsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AuditLogsClient />
      </div>
    </div>
  );
}
