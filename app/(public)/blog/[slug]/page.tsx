import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { ArticleView, ArticleData } from '@/components/blog/article-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const center = await getCenterData();

  if (center.features?.publicSite === false || center.features?.blog === false) {
    return { title: 'Not Found' };
  }

  const postRes = await serverFetch<ArticleData>(`/api/blog/${slug}`);
  if (!postRes.ok) {
    return {
      title: `Article | ${center.name}`,
    };
  }

  const post = postRes.data;
  const title = `${post.title} | ${center.name}`;
  const description = post.excerpt || post.title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const center = await getCenterData();

  if (center.features?.publicSite === false || center.features?.blog === false) {
    notFound();
  }

  const postRes = await serverFetch<ArticleData>(`/api/blog/${slug}`);
  if (!postRes.ok) {
    notFound();
  }

  const post = postRes.data;

  // JSON-LD Article Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.publishedAt || post.createdAt,
    author: {
      '@type': 'Person',
      name: post.authorName || center.name,
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: center.name,
      logo: center.logoUrl ? { '@type': 'ImageObject', url: center.logoUrl } : undefined,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleView
        post={post}
        timezone={center.timezone}
        locale={center.defaultLocale}
        centerName={center.name}
      />
    </>
  );
}
