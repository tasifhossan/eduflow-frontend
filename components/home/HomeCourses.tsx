'use client';

import * as React from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { BatchCard, BatchCardSkeleton, BatchCardData } from '@/components/ui/batch-card';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HomeCourses() {
  const { data, loading, error } = useApi<{ items: any[] }>('/api/public/batches?limit=8');

  if (loading) {
    return (
      <Section
        id="courses"
        title="Featured Courses & Batches"
        subtitle="Explore our comprehensive curriculum, expert mentors, and rigorous examination schedules."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <BatchCardSkeleton key={i} />
          ))}
        </div>
      </Section>
    );
  }

  const items = data?.items || [];
  // If no items exist or fetch failed, render NOTHING
  if (error || items.length === 0) {
    return null;
  }

  return (
    <Section
      id="courses"
      title="Featured Courses & Batches"
      subtitle="Explore our comprehensive curriculum, expert mentors, and rigorous examination schedules."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {items.map((batch: any) => {
          const cardData: BatchCardData = {
            id: batch.id,
            name: batch.name,
            slug: batch.slug,
            description: batch.description,
            type: batch.type,
            classLevel: batch.classLevel,
            feeAmount: batch.fee,
            feeType: batch.feeType,
            imageUrl: batch.imageUrl,
            ratingAverage: batch.avgRating,
            ratingCount: batch.reviewCount,
            branchName: batch.branch?.name,
            schedule: batch.nextSchedule,
            subjectName: batch.subject?.name,
          };

          return (
            <BatchCard
              key={batch.id}
              batch={cardData}
              href={`/batches/${batch.slug || batch.id}`}
            />
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <Button asChild variant="outline" size="lg" className="font-semibold">
          <Link href="/explore" className="inline-flex items-center gap-2">
            <span>View all courses</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
