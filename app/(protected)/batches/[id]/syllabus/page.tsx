'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { SyllabusProgressCard } from '@/components/dashboard/syllabus-progress-card';
import { Skeleton } from '@/components/ui/skeleton';

interface BatchDetails {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchSyllabusPage({ params }: PageProps) {
  const router = useRouter();
  const { id: batchId } = use(params);

  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes?.success && batchRes.data) {
          setBatch(batchRes.data);
        }
      } catch {
        // Handled gracefully below
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [batchId, router]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        </div>
      ) : (
        <>
          <PageHeader
            title={`${batch?.name || 'Batch'} · Syllabus Progress`}
            description="Track chapter completion status based on completed lectures"
            breadcrumbs={[
              { label: 'Batches', href: '/batches' },
              { label: batch?.name || 'Batch', href: `/batches/${batchId}` },
              { label: 'Syllabus Progress' },
            ]}
          />

          <SyllabusProgressCard batchId={batchId} />
        </>
      )}
    </div>
  );
}
