import * as React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SkipLink } from '@/components/layout/skip-link';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
