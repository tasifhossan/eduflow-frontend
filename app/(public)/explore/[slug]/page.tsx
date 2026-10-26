import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import {
  CourseDetailView,
  BatchDetailData,
  ReviewItem,
} from '@/components/explore/course-detail-view';
import { BatchCardData } from '@/components/ui/batch-card';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    return { title: 'Not Found' };
  }

  const batchRes = await serverFetch<BatchDetailData>(`/api/public/batches/${slug}`);
  if (!batchRes.ok) {
    return {
      title: `Course Details | ${center.name}`,
    };
  }

  const batch = batchRes.data;
  const title = `${batch.name} | ${center.name}`;
  const description =
    batch.description || `Comprehensive ${batch.type.toLowerCase()} course at ${center.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: batch.imageUrl ? [{ url: batch.imageUrl }] : undefined,
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    notFound();
  }

  const batchRes = await serverFetch<BatchDetailData>(`/api/public/batches/${slug}`);
  if (!batchRes.ok) {
    notFound();
  }

  const batch = batchRes.data;

  // Fetch reviews if feature enabled
  let reviews: ReviewItem[] = [];
  if (center.features.reviews) {
    const reviewsRes = await serverFetch<ReviewItem[]>(`/api/batches/${batch.id}/reviews`);
    if (reviewsRes.ok && Array.isArray(reviewsRes.data)) {
      reviews = reviewsRes.data;
    }
  }

  // Fetch related batches (in same subject or general batches)
  let relatedBatches: BatchCardData[] = [];
  const relatedRes = await serverFetch<{ items: Array<Record<string, unknown>> }>(
    `/api/public/batches?limit=4${batch.subject?.id ? `&subjectId=${batch.subject.id}` : ''}`
  );
  if (relatedRes.ok && Array.isArray(relatedRes.data?.items)) {
    relatedBatches = relatedRes.data.items
      .filter((b) => b.id !== batch.id)
      .map((b) => ({
        id: String(b.id),
        name: String(b.name),
        slug: b.slug ? String(b.slug) : undefined,
        type: b.type === 'ADMISSION' ? 'ADMISSION' : 'ACADEMIC',
        classLevel: b.classLevel ? String(b.classLevel) : undefined,
        feeAmount: typeof b.feeAmount === 'number' ? b.feeAmount : undefined,
        feeType: b.feeType === 'ONE_TIME' ? 'ONE_TIME' : 'MONTHLY',
        description: b.description ? String(b.description) : undefined,
        imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
        subjectName: (b.subject as { name?: string })?.name,
        branchName: (b.branch as { name?: string })?.name,
        ratingAverage: (b.stats as { averageRating?: number })?.averageRating,
        ratingCount: (b.stats as { reviewCount?: number })?.reviewCount,
      }));
  }

  // JSON-LD Course Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: batch.name,
    description: batch.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: center.name,
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
    ...(batch.feeAmount
      ? {
          offers: {
            '@type': 'Offer',
            price: batch.feeAmount,
            priceCurrency: center.currency || 'BDT',
            category: batch.feeType === 'MONTHLY' ? 'Monthly Tuition' : 'Full Course',
          },
        }
      : {}),
    ...(batch.stats?.averageRating && batch.stats.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: batch.stats.averageRating,
            reviewCount: batch.stats.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CourseDetailView
        batch={batch}
        relatedBatches={relatedBatches}
        reviews={reviews}
        currencySymbol={center.currencySymbol || '৳'}
        reviewsEnabled={Boolean(center.features.reviews)}
      />
    </>
  );
}
