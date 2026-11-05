'use client';

import React, { useState, useTransition, useEffect, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { BatchCard, BatchCardSkeleton, BatchCardData } from '@/components/ui/batch-card';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

export interface ExploreFiltersData {
  subjects: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  types: string[];
  feeRange?: { min: number; max: number };
}

export interface ExploreViewProps {
  initialBatches: BatchCardData[];
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: ExploreFiltersData;
  error?: string | null;
}

export function ExploreView({
  initialBatches,
  initialPagination,
  filters,
  error: serverError,
}: ExploreViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchInputId = useId();
  const sortSelectId = useId();
  const mobileSortSelectId = useId();
  const subjectSelectId = useId();
  const branchSelectId = useId();
  const typeSelectId = useId();

  // URL state
  const currentQ = searchParams.get('q') || '';
  const currentSubject = searchParams.get('subjectId') || '';
  const currentBranch = searchParams.get('branchId') || '';
  const currentType = searchParams.get('type') || '';
  const currentSort = searchParams.get('sortBy') || 'newest';
  const currentPage = Number(searchParams.get('page') || '1');

  // Local state for debounced search
  const [searchVal, setSearchVal] = useState(currentQ);
  const [prevQ, setPrevQ] = useState(currentQ);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync local search when URL changes without setState in effect
  if (prevQ !== currentQ) {
    setPrevQ(currentQ);
    setSearchVal(currentQ);
  }

  // Push new query to URL
  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
  };

  // Debounced search handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal !== currentQ) {
        updateFilters({ q: searchVal.trim() || null, page: '1' });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchVal, currentQ]);

  // Active filters count
  const activeFiltersCount = [
    Boolean(currentSubject),
    Boolean(currentBranch),
    Boolean(currentType),
    Boolean(currentQ),
  ].filter(Boolean).length;

  const handleClearAll = () => {
    setSearchVal('');
    const params = new URLSearchParams();
    if (currentSort !== 'newest') params.set('sortBy', currentSort);
    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className="py-8 sm:py-12">
      <Container>
        {/* Header & Title */}
        <div className="mb-8 space-y-2">
          <Badge variant="primary" size="sm" className="mb-1">
            Course Directory
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Explore Courses &amp; Batches
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Find the right academic or admission program tailored to your goals. Filter by subject, branch, or course type.
          </p>
        </div>

        {/* Top Bar: Search, Mobile Filter Button, Sort Dropdown */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input with Debounce */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor={searchInputId} className="sr-only">Search courses</label>
            <Input
              id={searchInputId}
              type="search"
              placeholder="Search courses, topics, or subjects..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-10 pr-9 h-11"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden h-11 flex-1 sm:flex-none justify-center gap-2"
              aria-expanded={isMobileDrawerOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="primary" size="sm" className="px-1.5 py-0 h-5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 min-w-[170px]">
              <label htmlFor={sortSelectId} className="text-xs text-muted-foreground font-medium hidden sm:inline whitespace-nowrap">
                Sort by:
              </label>
              <Select
                id={sortSelectId}
                value={currentSort}
                onChange={(e) => updateFilters({ sortBy: e.target.value, page: '1' })}
                className="h-11 text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="name-asc">Name (A - Z)</option>
                <option value="fee-asc">Fee: Low to High</option>
                <option value="fee-desc">Fee: High to Low</option>
                <option value="rating-desc">Top Rated</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar Filters + Batches List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Filter Courses</h2>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Program Type */}
            <div className="space-y-2">
              <label htmlFor={typeSelectId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Program Type
              </label>
              <Select
                id={typeSelectId}
                value={currentType}
                onChange={(e) => updateFilters({ type: e.target.value || null, page: '1' })}
                className="h-10 text-xs"
              >
                <option value="">All Program Types</option>
                <option value="ACADEMIC">Academic</option>
                <option value="ADMISSION">Admission</option>
              </Select>
            </div>

            {/* Subject Filter */}
            {filters.subjects.length > 0 && (
              <div className="space-y-2">
                <label htmlFor={subjectSelectId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Subject
                </label>
                <Select
                  id={subjectSelectId}
                  value={currentSubject}
                  onChange={(e) => updateFilters({ subjectId: e.target.value || null, page: '1' })}
                  className="h-10 text-xs"
                >
                  <option value="">All Subjects</option>
                  {filters.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Branch Filter */}
            {filters.branches.length > 0 && (
              <div className="space-y-2">
                <label htmlFor={branchSelectId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Campus / Branch
                </label>
                <Select
                  id={branchSelectId}
                  value={currentBranch}
                  onChange={(e) => updateFilters({ branchId: e.target.value || null, page: '1' })}
                  className="h-10 text-xs"
                >
                  <option value="">All Campuses</option>
                  {filters.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Active filters badges */}
            {activeFiltersCount > 0 && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Active Filters ({activeFiltersCount})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentSubject && (
                    <Badge variant="secondary" size="sm" className="gap-1 pr-1">
                      <span>{filters.subjects.find((s) => s.id === currentSubject)?.name || 'Subject'}</span>
                      <button
                        type="button"
                        onClick={() => updateFilters({ subjectId: null, page: '1' })}
                        aria-label="Remove subject filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {currentBranch && (
                    <Badge variant="secondary" size="sm" className="gap-1 pr-1">
                      <span>{filters.branches.find((b) => b.id === currentBranch)?.name || 'Branch'}</span>
                      <button
                        type="button"
                        onClick={() => updateFilters({ branchId: null, page: '1' })}
                        aria-label="Remove branch filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {currentType && (
                    <Badge variant="secondary" size="sm" className="gap-1 pr-1">
                      <span>{currentType}</span>
                      <button
                        type="button"
                        onClick={() => updateFilters({ type: null, page: '1' })}
                        aria-label="Remove program type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Batches Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Server Error State */}
            {serverError ? (
              <ErrorState
                title="Unable to load courses"
                message={serverError}
                onRetry={() => router.refresh()}
              />
            ) : isPending ? (
              /* Skeleton Grid during transitions */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <BatchCardSkeleton key={idx} />
                ))}
              </div>
            ) : initialBatches.length === 0 ? (
              /* Empty State */
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-muted-foreground/60" />}
                title="No courses matched your filters"
                description={
                  activeFiltersCount > 0
                    ? 'Try clearing some of your search terms or filters to see more results.'
                    : 'There are currently no active published courses available for enrollment.'
                }
                action={
                  activeFiltersCount > 0 ? (
                    <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Clear all filters</span>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              /* Loaded Batches Grid */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {initialBatches.map((batch) => (
                    <BatchCard key={batch.id} batch={batch} />
                  ))}
                </div>

                {/* Pagination */}
                {initialPagination.totalPages > 1 && (
                  <div className="pt-8 flex justify-center">
                    <Pagination
                      currentPage={initialPagination.page}
                      totalPages={initialPagination.totalPages}
                      onPageChange={(page) => updateFilters({ page: String(page) })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isMobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter Courses"
            className="fixed inset-0 z-[var(--z-modal)] flex justify-end lg:hidden"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 flex h-full w-full max-w-xs flex-col bg-surface border-l border-border shadow-xl p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Filters</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  aria-label="Close filters drawer"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Filter Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor={mobileSortSelectId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sort By
                  </label>
                  <Select
                    id={mobileSortSelectId}
                    value={currentSort}
                    onChange={(e) => updateFilters({ sortBy: e.target.value, page: '1' })}
                    className="h-10 text-xs"
                  >
                    <option value="newest">Newest First</option>
                    <option value="name-asc">Name (A - Z)</option>
                    <option value="fee-asc">Fee: Low to High</option>
                    <option value="fee-desc">Fee: High to Low</option>
                    <option value="rating-desc">Top Rated</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Program Type
                  </label>
                  <Select
                    value={currentType}
                    onChange={(e) => updateFilters({ type: e.target.value || null, page: '1' })}
                    className="h-10 text-xs"
                  >
                    <option value="">All Program Types</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="ADMISSION">Admission</option>
                  </Select>
                </div>

                {filters.subjects.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Subject
                    </label>
                    <Select
                      value={currentSubject}
                      onChange={(e) => updateFilters({ subjectId: e.target.value || null, page: '1' })}
                      className="h-10 text-xs"
                    >
                      <option value="">All Subjects</option>
                      {filters.subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </div>
                )}

                {filters.branches.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Branch / Campus
                    </label>
                    <Select
                      value={currentBranch}
                      onChange={(e) => updateFilters({ branchId: e.target.value || null, page: '1' })}
                      className="h-10 text-xs"
                    >
                      <option value="">All Campuses</option>
                      {filters.branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* Drawer Action Buttons */}
              <div className="pt-4 border-t border-border mt-auto space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setIsMobileDrawerOpen(false)}
                >
                  Apply Filters
                </Button>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
