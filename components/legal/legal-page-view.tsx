'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { SafeText } from '@/components/content/safe-text';
import { useAuth } from '@/components/providers/auth-provider';
import { formatDate } from '@/lib/format';
import { ShieldCheck, FileText, Info, Settings, Calendar } from 'lucide-react';

export interface LegalPageViewProps {
  title: string;
  type: 'privacy' | 'terms';
  content: string;
  updatedOn?: string | null;
  isDefaultTemplate: boolean;
  centerName: string;
  timezone?: string;
  locale?: string;
}

export function LegalPageView({
  title,
  type,
  content,
  updatedOn,
  isDefaultTemplate,
  centerName,
  timezone,
  locale,
}: LegalPageViewProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const updatedDateStr = updatedOn
    ? formatDate(updatedOn, timezone, locale)
    : 'Standard Center Policy';

  return (
    <div className="py-8 sm:py-16">
      <Container>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                Legal &amp; Compliance
              </Badge>
              {isDefaultTemplate && (
                <Badge variant="neutral" size="sm">
                  Standard Policy
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                {type === 'privacy' ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {title}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>Effective Date: {updatedDateStr}</span>
                  <span>&bull;</span>
                  <span>{centerName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Super Admin Notice if viewing default template */}
          {isSuperAdmin && isDefaultTemplate && (
            <div className="p-3.5 rounded-[var(--radius-control)] border border-primary/30 bg-primary/5 flex items-start gap-3 text-xs text-foreground">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-primary">Administrator Notice: </span>
                You are currently viewing the default institutional legal template. You can customize this text at any time from{' '}
                <Link
                  href="/settings"
                  className="font-bold underline underline-offset-4 hover:text-primary inline-flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  Settings &gt; Pages
                </Link>
                .
              </div>
            </div>
          )}

          {/* Legal Text rendered safely */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-10 shadow-xs">
            <SafeText content={content} className="prose-content" />
          </div>
        </div>
      </Container>
    </div>
  );
}
