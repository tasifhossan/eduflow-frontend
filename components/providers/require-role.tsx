'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export interface RequireRoleProps {
  roles?: Array<'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN' | 'ACCOUNTANT'>;
  children: React.ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-32 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-32 w-full rounded-[var(--radius-card)]" />
        </div>
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Authentication required. Redirecting...
      </div>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          You do not have the required permissions to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

