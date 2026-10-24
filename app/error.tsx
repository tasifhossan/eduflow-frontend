'use client';

import * as React from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled Root Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <ErrorState
          title="Something went wrong"
          message={error.message || 'An unexpected application error occurred. Please try again.'}
          onRetry={() => reset()}
          retryLabel="Reload application"
        />
      </div>
    </div>
  );
}
