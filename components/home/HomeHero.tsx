'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CenterPublicData } from '@/lib/types/center';
import { useAuth } from '@/components/providers/auth-provider';
import { useApi } from '@/lib/use-api';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ArrowRight, GraduationCap, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

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

  return (
    <section className="relative overflow-hidden bg-background py-14 sm:py-20 lg:py-24 border-b border-border/60">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Admissions & Academic Coaching</span>
            </div>

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

            {/* Micro feature checklist */}
            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                <span>Structured Routine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                <span>Weekly Assessments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                <span>Real-Time Attendance</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image or Tasteful Tokens-Only Illustration */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden border border-border bg-surface shadow-card">
              {heroImage && !imgError ? (
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                /* Tasteful tokens-only illustration when no custom hero image */
                <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/10 via-surface to-secondary/10 text-center">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-[var(--radius-card)] bg-primary/15 text-primary mb-4 shadow-sm">
                    <GraduationCap className="h-10 w-10" aria-hidden="true" />
                    <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] bg-secondary text-secondary-foreground shadow-sm">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">
                    {center.shortName || center.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Committed to student mentorship, interactive classrooms, and exam success.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
