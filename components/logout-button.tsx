'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { clearExamBackups } from '@/lib/client-auth';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      clearExamBackups();
      // Call POST /api/auth/logout backend to clear session cookie
      await apiPost('/api/auth/logout');
    } catch (err) {
      clearExamBackups();
      console.warn('Backend logout failed:', err);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 transition"
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
