'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // Call POST /api/auth/logout backend to clear session cookie
      await apiPost('/api/auth/logout');
    } catch (err) {
      console.warn('Backend logout failed or not implemented:', err);
    } finally {
      // Always clear the local cookie to ensure redirect works immediately
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
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
