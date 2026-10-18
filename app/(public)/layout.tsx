import * as React from 'react';
import { AuthProvider } from '@/components/providers/auth-provider';
import { SkipLink } from '@/components/layout/skip-link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SkipLink />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
