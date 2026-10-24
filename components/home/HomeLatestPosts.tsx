'use client';

import * as React from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { BlogCard, BlogPostData } from '@/components/cards/BlogCard';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export interface HomeLatestPostsProps {
  enabled?: boolean;
}

export function HomeLatestPosts({ enabled = true }: HomeLatestPostsProps) {
  // If blog feature flag is off, render NOTHING
  const shouldFetch = enabled;
  const { data, loading, error } = useApi<{ items?: BlogPostData[] } | BlogPostData[]>(
    shouldFetch ? '/api/blog?limit=3' : null,
    { enabled: shouldFetch }
  );

  if (!shouldFetch || loading || error) {
    return null;
  }

  const items = Array.isArray(data) ? data : data?.items || [];
  if (items.length === 0) {
    return null;
  }

  return (
    <Section
      title="Latest Academic Insights"
      subtitle="Exam preparation tips, revision techniques, and board syllabus updates."
      className="bg-surface/50 border-b border-border/60"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {items.slice(0, 3).map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button asChild variant="outline" size="md">
          <Link href="/blog" className="inline-flex items-center gap-2">
            <span>Read all articles</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
