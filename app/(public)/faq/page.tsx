import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { FaqView, FaqItemData } from '@/components/faq/faq-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Frequently Asked Questions | ${center.name}`,
    description: `Answers to common questions regarding admissions, batch enrollments, exams, and guardian updates at ${center.name}.`,
  };
}

export default async function FaqPage() {
  const center = await getCenterData();

  if (center.features?.publicSite === false) {
    notFound();
  }

  const faqRes = await serverFetch<FaqItemData[]>('/api/faq');
  const items = faqRes.ok && Array.isArray(faqRes.data) ? faqRes.data : [];

  // Generate JSON-LD FAQPage Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqView initialItems={items} centerName={center.name} />
    </>
  );
}
