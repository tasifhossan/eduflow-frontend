'use client';

import * as React from 'react';
import type { CenterPublicData } from '@/lib/types/center';
import { DashboardSidebar } from './sidebar';
import { DashboardHeader } from './header';

export interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    studentCode?: string | null;
    role: string;
    branchId?: string;
  };
  center: CenterPublicData;
  branchName?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  center,
  branchName,
  children,
}: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar: Desktop fixed, Mobile drawer */}
      <DashboardSidebar
        center={center}
        userRole={user.role}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader
          user={user}
          branchName={branchName}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-background focus:outline-none custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
