import * as React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SkipLink } from '@/components/layout/skip-link';
import { AuthShell } from '@/components/auth/auth-shell';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AuthProvider initialUser={user}>
      <SkipLink />
      <AuthShell>{children}</AuthShell>
    </AuthProvider>
  );
}
