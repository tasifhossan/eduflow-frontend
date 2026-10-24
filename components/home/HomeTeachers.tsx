'use client';

import * as React from 'react';
import { useApi } from '@/lib/use-api';
import { TeacherCard, TeacherData } from '@/components/cards/TeacherCard';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeTeachers() {
  const { data, loading, error } = useApi<{ items?: TeacherData[] } | TeacherData[]>(
    '/api/public/teachers?limit=8'
  );

  if (loading) {
    return (
      <Section
        title="Meet Our Faculty"
        subtitle="Experienced subject specialists dedicated to high-standard academic mentoring."
        className="bg-surface/50 border-b border-border/60"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-[var(--radius-card)] border border-border bg-surface flex flex-col items-center space-y-3">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </Section>
    );
  }

  const items = Array.isArray(data) ? data : data?.items || [];
  if (error || items.length === 0) {
    return null;
  }

  return (
    <Section
      title="Meet Our Faculty"
      subtitle="Experienced subject specialists dedicated to high-standard academic mentoring."
      className="bg-surface/50 border-b border-border/60"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {items.slice(0, 8).map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} />
        ))}
      </div>
    </Section>
  );
}
