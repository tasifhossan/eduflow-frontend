import React from 'react';
import type { Metadata } from 'next';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { LegalPageView } from '@/components/legal/legal-page-view';
import { getDefaultTermsOfService } from '@/components/legal/default-legal-templates';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Terms of Service | ${center.name}`,
    description: `Academic enrollment guidelines, fee schedules, attendance policies, and code of conduct for ${center.name}.`,
  };
}

interface LegalPageApiResponse {
  text?: string | null;
  updatedOn?: string | null;
}

export default async function TermsPage() {
  const center = await getCenterData();

  // Fetch DB override if available
  const res = await serverFetch<LegalPageApiResponse>('/api/public/pages/terms');
  const overrideText = res.ok && res.data?.text ? res.data.text : center.legal?.termsText;
  const updatedOn = res.ok ? res.data?.updatedOn : null;

  const content = overrideText || getDefaultTermsOfService(center);
  const isDefaultTemplate = !overrideText;

  return (
    <LegalPageView
      title="Terms of Service"
      type="terms"
      content={content}
      updatedOn={updatedOn}
      isDefaultTemplate={isDefaultTemplate}
      centerName={center.name}
      timezone={center.timezone}
      locale={center.defaultLocale}
    />
  );
}
