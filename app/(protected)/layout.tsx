import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { getCenterData } from '@/lib/center';
import { apiGet } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const center = await getCenterData();

  // If user is not authenticated, redirect to login page
  if (!user) {
    redirect('/login');
  }

  // Attempt to resolve branch name from /api/me
  let branchName: string | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const meRes = await apiGet<{ success: boolean; data?: { branch?: { name?: string } } }>('/api/me', {
        headers: { Cookie: `token=${token}` },
      });
      if (meRes.success && meRes.data?.branch?.name) {
        branchName = meRes.data.branch.name;
      }
    }
  } catch {
    branchName = null;
  }

  return (
    <DashboardShell user={user} center={center} branchName={branchName}>
      {children}
    </DashboardShell>
  );
}
