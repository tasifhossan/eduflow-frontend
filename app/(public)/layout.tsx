import * as React from 'react';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SkipLink } from '@/components/layout/skip-link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getCurrentUser } from '@/lib/auth';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AuthProvider initialUser={user}>
      <SkipLink />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main id="main" tabIndex={-1} className="flex-1 focus-ring">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
