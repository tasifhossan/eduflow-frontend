'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchResourcesRedirectPage({ params }: PageProps) {
  const { id: batchId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === 'STUDENT' || user?.role === 'GUARDIAN') {
      router.replace(`/my-materials?batchId=${encodeURIComponent(batchId)}`);
    } else {
      router.replace(`/materials?batchId=${encodeURIComponent(batchId)}`);
    }
  }, [batchId, user, isLoading, router]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}
