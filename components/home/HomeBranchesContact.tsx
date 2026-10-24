'use client';

import * as React from 'react';
import { CenterPublicData } from '@/lib/types/center';
import { useApi } from '@/lib/use-api';
import { BranchCard, BranchData } from '@/components/cards/BranchCard';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, MessageCircle, MapPin } from 'lucide-react';

export interface HomeBranchesContactProps {
  center: CenterPublicData;
}

export function HomeBranchesContact({ center }: HomeBranchesContactProps) {
  const { data, loading, error } = useApi<{ items?: BranchData[] } | BranchData[]>(
    '/api/public/branches'
  );

  if (loading) {
    return (
      <Section
        id="contact"
        title="Our Campuses & Contact"
        subtitle="Visit our branch offices or connect with our academic coordinators."
        className="bg-background border-b border-border/60"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-[var(--radius-card)] border border-border bg-surface space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </Section>
    );
  }

  const branches = Array.isArray(data) ? data : data?.items || [];
  // Strict rule: only shown if at least one branch exists
  if (error || branches.length === 0) {
    return null;
  }

  // Clean WhatsApp digits
  const waDigits = center.whatsapp?.replace(/\D/g, '') || '';
  const waUrl = waDigits ? `https://wa.me/${waDigits.startsWith('880') ? waDigits : `880${waDigits.replace(/^0/, '')}`}` : null;

  return (
    <Section
      id="contact"
      title="Our Campuses & Contact"
      subtitle="Visit our branch offices or connect directly with our academic coordinators."
      className="bg-background border-b border-border/60"
    >
      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {branches.map((b) => (
          <BranchCard key={b.id} branch={b} />
        ))}
      </div>

      {/* Central Contact Strip */}
      <div className="mt-12 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 shadow-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Central Academic Inquiries
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {center.contactPhone && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Helpline</div>
                <a
                  href={`tel:${center.contactPhone}`}
                  className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors"
                >
                  {center.contactPhone}
                </a>
              </div>
            </div>
          )}

          {center.contactEmail && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Email Us</div>
                <a
                  href={`mailto:${center.contactEmail}`}
                  className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {center.contactEmail}
                </a>
              </div>
            </div>
          )}

          {waUrl && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[#25D366]/15 text-[#25D366]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">WhatsApp Chat</div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base font-bold text-foreground hover:text-[#25D366] transition-colors"
                >
                  Message our team
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
