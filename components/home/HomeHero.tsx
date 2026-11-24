'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CenterPublicData } from '@/lib/types/center';
import { useAuth } from '@/components/providers/auth-provider';
import { useApi } from '@/lib/use-api';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Award,
  Calendar,
  TrendingUp,
} from 'lucide-react';

export interface HomeHeroProps {
  center: CenterPublicData;
}

export function HomeHero({ center }: HomeHeroProps) {
  const { user } = useAuth();
  const [imgError, setImgError] = React.useState(false);

  // Check if at least one published batch exists to display "View courses"
  const { data: batchesRes } = useApi<{ items?: any[] }>('/api/public/batches?limit=1');
  const hasPublishedBatches = Boolean(batchesRes?.items && batchesRes.items.length > 0);

  const title = center.homepage?.heroTitle || center.name || 'Empowering Future Scholars';
  const subtitle = center.homepage?.heroSubtitle || center.tagline || 'Excellence in coaching, structured learning, and board exam preparation.';
  const heroImage = center.homepage?.heroImageUrl;

  const handleScrollToEnquire = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById('enquire');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const validHeroPoints = (center.homepage?.heroPoints || []).filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );

  return (
    <section className="relative overflow-hidden bg-background py-14 sm:py-20 lg:py-24 border-b border-border/60">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {center.homepage?.heroBadge?.trim() ? (
              <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{center.homepage.heroBadge.trim()}</span>
              </div>
            ) : null}

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {subtitle}
            </p>

            {/* CTAs strictly matching requirement 6b */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Button
                asChild
                variant="primary"
                size="lg"
                className="font-bold shadow-md hover:shadow-lg transition-all"
              >
                <a href="#enquire" onClick={handleScrollToEnquire}>
                  <span>Enquire now</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                </a>
              </Button>

              {hasPublishedBatches && (
                <Button asChild variant="outline" size="lg" className="font-semibold">
                  <Link href="/explore">
                    <span>View courses</span>
                  </Link>
                </Button>
              )}

              <Button asChild variant="ghost" size="lg" className="font-semibold text-foreground">
                <Link href={user ? '/dashboard' : '/login'}>
                  <span>{user ? 'Go to dashboard' : 'Student login'}</span>
                </Link>
              </Button>
            </div>

            {/* Feature checklist from settings (nothing rendered if empty) */}
            {validHeroPoints.length > 0 ? (
              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                {validHeroPoints.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Right Column: Hero Image or Rich Academic Showcase Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            {heroImage && !imgError ? (
              <div className="relative w-full max-w-md aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden border border-border bg-surface shadow-card">
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              /* Rich Academic Showcase Card */
              <div className="relative w-full max-w-md rounded-[var(--radius-card)] border border-border bg-gradient-to-b from-surface via-surface to-primary/5 p-6 sm:p-7 shadow-card space-y-5">
                {/* Header: Center identity & active admissions status */}
                <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {center.logoUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface p-1.5 border border-border shadow-sm">
                        <Image
                          src={center.logoUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain"
                          unoptimized
                          priority
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-white font-black text-xl shadow-sm select-none">
                        {center.shortName?.[0] || center.name?.[0] || 'S'}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <h2 className="text-base font-bold text-foreground truncate">
                        {center.name || center.shortName}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {center.shortName ? `${center.shortName} • Academic Portal` : 'Coaching & Academic Care'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-status-success-border bg-status-success-bg px-2.5 py-1 text-[11px] font-semibold text-status-success-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
                    <span>Admissions Open</span>
                  </div>
                </div>

                {/* Key Academic Pillars */}
                <div className="grid grid-cols-2 gap-2.5 text-left">
                  <div className="rounded-[var(--radius-control)] border border-border/70 bg-surface-hover/40 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-xs font-bold text-foreground">Science & Math</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Structured board syllabus & concept mastery
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-control)] border border-border/70 bg-surface-hover/40 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                      <Award className="h-4 w-4" />
                      <span className="text-xs font-bold text-foreground">Model Tests</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Weekly evaluations & rank-wise marksheet
                    </p>
                  </div>
                </div>

                {/* Live Academic Schedule Preview Widget */}
                <div className="rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Today&apos;s Class Routine
                    </span>
                    <span className="text-[10px] font-medium text-primary px-2 py-0.5 rounded-[var(--radius-pill)] bg-primary/10">
                      Live Schedule
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
                    <span>Regular Batches (Morning & Evening)</span>
                    <span className="font-semibold text-foreground">Active Routine</span>
                  </div>
                </div>

                {/* Live Attendance & Performance Preview Bar */}
                <div className="space-y-1.5 text-left pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-secondary" />
                      Academic Performance & Attendance
                    </span>
                    <span className="font-bold text-foreground">95%+</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface-sunken border border-border/60">
                    <div className="h-full rounded-[var(--radius-pill)] bg-primary w-[95%]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
