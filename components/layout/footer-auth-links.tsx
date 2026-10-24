'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';

export function FooterAuthLinks() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <li>
        <span className="inline-block h-3.5 w-16 bg-muted animate-pulse rounded" />
      </li>
    );
  }

  if (user) {
    return (
      <li>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors font-medium text-xs"
        >
          Dashboard
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground transition-colors font-medium text-xs"
      >
        Log in
      </Link>
    </li>
  );
}
