'use client';

import * as React from 'react';
import { useApi } from '@/lib/use-api';
import { TestimonialCard, TestimonialData } from '@/components/cards/TestimonialCard';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';

export interface HomeTestimonialsProps {
  enabled?: boolean;
}

export function HomeTestimonials({ enabled = true }: HomeTestimonialsProps) {
  // If testimonials feature flag is off, render NOTHING
  const shouldFetch = enabled;
  const { data, loading, error } = useApi<{ items?: TestimonialData[] } | TestimonialData[]>(
    shouldFetch ? '/api/testimonials' : null,
    { enabled: shouldFetch }
  );

  if (!shouldFetch) {
    return null;
  }

  if (loading) {
    return (
      <Section
        title="Student Success Stories"
        subtitle="Feedback from past candidates on classroom mentorship and mock preparation."
        className="bg-surface/50 border-b border-border/60"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-[var(--radius-card)] border border-border bg-surface space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-32" />
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
      title="Student Success Stories"
      subtitle="Feedback from past candidates on classroom mentorship and mock preparation."
      className="bg-surface/50 border-b border-border/60"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {items.slice(0, 6).map((item) => (
          <TestimonialCard key={item.id} testimonial={item} />
        ))}
      </div>
    </Section>
  );
}
