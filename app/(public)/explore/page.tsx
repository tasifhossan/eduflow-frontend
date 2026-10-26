import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { ExploreView, ExploreFiltersData } from '@/components/explore/explore-view';
import { BatchCardData } from '@/components/ui/batch-card';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Explore Courses & Batches | ${center.name}`,
    description: `Browse academic and admission coaching batches, schedules, and enrollment options at ${center.name}.`,
  };
}

interface PublicBatchesResponse {
  items: Array<{
    id: string;
    name: string;
    slug?: string;
    type: 'ACADEMIC' | 'ADMISSION';
    classLevel?: string | null;
    feeType?: 'MONTHLY' | 'ONE_TIME';
    feeAmount?: number;
    description?: string;
    imageUrl?: string | null;
    subject?: { id: string; name: string };
    branch?: { id: string; name: string; address?: string };
    teacher?: { id: string; name: string; avatarUrl?: string };
    stats?: {
      enrolledCount?: number;
      reviewCount?: number;
      averageRating?: number;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string;
    subjectId?: string;
    branchId?: string;
    type?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const center = await getCenterData();

  // Gating: If publicSite is disabled, return 404
  if (center.features?.publicSite === false) {
    notFound();
  }

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const subjectId = resolvedParams.subjectId || '';
  const branchId = resolvedParams.branchId || '';
  const type = resolvedParams.type || '';
  const sortBy = resolvedParams.sortBy || 'newest';
  const page = resolvedParams.page || '1';

  // Build query string for backend
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (subjectId) query.set('subjectId', subjectId);
  if (branchId) query.set('branchId', branchId);
  if (type) query.set('type', type);
  if (sortBy) query.set('sortBy', sortBy);
  if (page && page !== '1') query.set('page', page);
  query.set('limit', '12');

  // Fetch batches & filters in parallel
  const [batchesRes, filtersRes] = await Promise.all([
    serverFetch<PublicBatchesResponse>(`/api/public/batches?${query.toString()}`),
    serverFetch<ExploreFiltersData>('/api/public/filters'),
  ]);

  let batches: BatchCardData[] = [];
  let pagination = { total: 0, page: 1, limit: 12, totalPages: 1 };
  let error: string | null = null;

  if (batchesRes.ok) {
    batches = batchesRes.data.items.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      type: b.type,
      classLevel: b.classLevel,
      feeType: b.feeType,
      feeAmount: b.feeAmount,
      description: b.description,
      imageUrl: b.imageUrl,
      subjectName: b.subject?.name,
      branchName: b.branch?.name,
      ratingAverage: b.stats?.averageRating,
      ratingCount: b.stats?.reviewCount,
    }));
    pagination = batchesRes.data.pagination;
  } else if (batchesRes.failed) {
    error = batchesRes.error;
  }

  const filters: ExploreFiltersData = filtersRes.ok
    ? filtersRes.data
    : { subjects: [], branches: [], types: ['ACADEMIC', 'ADMISSION'] };

  return (
    <ExploreView
      initialBatches={batches}
      initialPagination={pagination}
      filters={filters}
      error={error}
    />
  );
}
