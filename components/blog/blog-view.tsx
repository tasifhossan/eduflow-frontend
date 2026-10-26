'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { BlogCard, BlogPostData } from '@/components/cards/BlogCard';
import { Search, X, BookOpen, RotateCcw } from 'lucide-react';

export interface BlogViewProps {
  initialPosts: BlogPostData[];
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  categories: string[];
}

export function BlogView({
  initialPosts,
  initialPagination,
  categories,
}: BlogViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCategory = searchParams.get('category') || '';
  const currentQ = searchParams.get('q') || '';
  const [searchVal, setSearchVal] = useState(currentQ);
  const [prevQ, setPrevQ] = useState(currentQ);

  if (prevQ !== currentQ) {
    setPrevQ(currentQ);
    setSearchVal(currentQ);
  }

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || (key === 'page' && val === '1')) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`/blog?${params.toString()}`);
    });
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal !== currentQ) {
        updateFilters({ q: searchVal.trim() || null, page: '1' });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchVal, currentQ]);

  return (
    <div className="py-8 sm:py-16">
      <Container>
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
          <Badge variant="primary" size="sm">
            Insights &amp; Academic News
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Blog &amp; Educational Articles
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Exam preparation strategies, subject syllabus breakdowns, and coaching center updates.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto pt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search articles by title or keyword..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-10 pr-9 h-11 text-sm bg-surface shadow-xs"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Tab Bar */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              type="button"
              onClick={() => updateFilters({ category: null, page: '1' })}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                !currentCategory
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              All Articles
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => updateFilters({ category: cat, page: '1' })}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  currentCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        {isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 rounded-[var(--radius-card)] bg-surface border border-border animate-pulse"
              />
            ))}
          </div>
        ) : initialPosts.length === 0 ? (
          <div className="max-w-md mx-auto">
            <EmptyState
              icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
              title="No articles found"
              description={
                currentCategory || currentQ
                  ? 'No posts matched your current search filters.'
                  : 'We are currently preparing fresh academic articles. Check back soon!'
              }
              action={
                (currentCategory || currentQ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchVal('');
                      updateFilters({ category: null, q: null, page: '1' });
                    }}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {initialPagination.totalPages > 1 && (
              <div className="pt-10 flex justify-center">
                <Pagination
                  currentPage={initialPagination.page}
                  totalPages={initialPagination.totalPages}
                  onPageChange={(page) => updateFilters({ page: String(page) })}
                />
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
