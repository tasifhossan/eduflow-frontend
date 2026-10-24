'use client';

import * as React from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { Container } from '@/components/ui/container';
import { BookOpen } from 'lucide-react';

export function HomeSubjects() {
  const { data, loading, error } = useApi<{ subjects?: Array<{ id: string; name: string }> }>(
    '/api/public/filters'
  );

  if (loading || error) {
    return null;
  }

  const subjects = data?.subjects || [];
  // Strict rule: show only when two or more subjects have published batches
  if (subjects.length < 2) {
    return null;
  }

  return (
    <div className="py-6 bg-surface border-b border-border/60">
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wider">
            Explore Subjects:
          </span>
          {subjects.map((sub) => (
            <Link
              key={sub.id}
              href={`/explore?subjectId=${sub.id}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookOpen className="h-3 w-3 text-primary/70 shrink-0" aria-hidden="true" />
              <span>{sub.name}</span>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
