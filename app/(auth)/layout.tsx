import * as React from 'react';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SkipLink } from '@/components/layout/skip-link';
import { AuthShell } from '@/components/auth/auth-shell';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SkipLink />
      <AuthShell>{children}</AuthShell>
    </AuthProvider>
  );
}
