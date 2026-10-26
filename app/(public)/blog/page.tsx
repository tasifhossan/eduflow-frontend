import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { BlogView } from '@/components/blog/blog-view';
import { BlogPostData } from '@/components/cards/BlogCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Blog & Articles | ${center.name}`,
    description: `Educational guides, academic insights, and coaching updates from ${center.name}.`,
  };
}

interface BlogListApiResponse {
  items: BlogPostData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BlogPageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const center = await getCenterData();

  if (center.features?.publicSite === false || center.features?.blog === false) {
    notFound();
  }

  const resolved = await searchParams;
  const category = resolved.category || '';
  const q = resolved.q || '';
  const page = resolved.page || '1';

  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (q) query.set('q', q);
  if (page && page !== '1') query.set('page', page);
  query.set('limit', '9');

  const res = await serverFetch<BlogListApiResponse>(`/api/blog?${query.toString()}`);

  const items = res.ok && Array.isArray(res.data?.items) ? res.data.items : [];
  const pagination = res.ok && res.data?.pagination ? res.data.pagination : { total: 0, page: 1, limit: 9, totalPages: 1 };

  // Fetch category list by querying without category filter or extracting from items
  const catRes = await serverFetch<BlogListApiResponse>('/api/blog?limit=50');
  const allPosts = catRes.ok && Array.isArray(catRes.data?.items) ? catRes.data.items : items;
  const categoriesSet = new Set<string>();
  allPosts.forEach((p) => {
    if (p.category?.trim()) categoriesSet.add(p.category.trim());
  });
  const categories = Array.from(categoriesSet).sort();

  return (
    <BlogView
      initialPosts={items}
      initialPagination={pagination}
      categories={categories}
    />
  );
}
