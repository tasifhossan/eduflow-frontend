import React from 'react';
import type { Metadata } from 'next';
import { getCenterData } from '@/lib/center';
import { serverFetch } from '@/lib/server-api';
import { LegalPageView } from '@/components/legal/legal-page-view';
import { getDefaultPrivacyPolicy } from '@/components/legal/default-legal-templates';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenterData();
  return {
    title: `Privacy Policy | ${center.name}`,
    description: `How ${center.name} safeguards personal data, attendance logs, and student academic records.`,
  };
}

interface LegalPageApiResponse {
  text?: string | null;
  updatedOn?: string | null;
}

export default async function PrivacyPage() {
  const center = await getCenterData();

  // Fetch DB override if available
  const res = await serverFetch<LegalPageApiResponse>('/api/public/pages/privacy');
  const overrideText = res.ok && res.data?.text ? res.data.text : center.legal?.privacyText;
  const updatedOn = res.ok ? res.data?.updatedOn : null;

  const content = overrideText || getDefaultPrivacyPolicy(center);
  const isDefaultTemplate = !overrideText;

  return (
    <LegalPageView
      title="Privacy Policy"
      type="privacy"
      content={content}
      updatedOn={updatedOn}
      isDefaultTemplate={isDefaultTemplate}
      centerName={center.name}
      timezone={center.timezone}
      locale={center.defaultLocale}
    />
  );
}
