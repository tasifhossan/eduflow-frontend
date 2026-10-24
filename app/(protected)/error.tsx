'use client';

import * as React from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Protected Route Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Error loading dashboard module"
          message={error.message || 'We encountered an error while fetching your dashboard data.'}
          onRetry={() => reset()}
          retryLabel="Retry loading"
        />
      </div>
    </div>
  );
}
