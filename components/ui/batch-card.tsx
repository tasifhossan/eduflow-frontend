'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Card } from './card';
import { Badge } from './badge';
import { Rating } from './rating';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { BookOpen, Calendar, MapPin, Tag } from 'lucide-react';

export interface BatchCardData {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  feeType?: 'MONTHLY' | 'ONE_TIME';
  feeAmount?: number;
  imageUrl?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  branchName?: string;
  schedule?: string;
  subjectName?: string;
}

export interface BatchCardProps {
  batch: BatchCardData;
  href?: string;
  className?: string;
}

export function BatchCard({ batch, href, className }: BatchCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const targetHref = href || `/batches/${batch.id}`;

  const formattedFee =
    batch.feeAmount !== undefined && batch.feeAmount !== null
      ? `৳${batch.feeAmount.toLocaleString()}${batch.feeType === 'MONTHLY' ? '/mo' : ''}`
      : 'Free';

  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col h-full w-full overflow-hidden border border-border bg-surface text-foreground transition-all duration-200',
        className
      )}
    >
      {/* 16/10 Fixed-Aspect Image Container with Fallback */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {batch.imageUrl && !imageError ? (
          <Image
            src={batch.imageUrl}
            alt={batch.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-secondary/10">
            <BookOpen className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
          </div>
        )}

        {/* Category Badge overlay on top-left */}
        <div className="absolute left-3 top-3 z-10">
          <Badge
            variant={batch.type === 'ADMISSION' ? 'accent' : 'primary'}
            size="sm"
            className="shadow-sm backdrop-blur-md"
          >
            {batch.type}
          </Badge>
        </div>

        {batch.classLevel && (
          <div className="absolute right-3 top-3 z-10">
            <Badge variant="neutral" size="sm" className="bg-surface/90 shadow-sm backdrop-blur-md">
              {batch.classLevel}
            </Badge>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        {/* Rating and Subject */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {batch.subjectName ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Tag className="h-3 w-3" />
              {batch.subjectName}
            </span>
          ) : (
            <span />
          )}

          <Rating
            value={batch.ratingAverage ?? 4.8}
            size="sm"
            showCount
            count={batch.ratingCount ?? 24}
          />
        </div>

        {/* Title clamped to 2 lines with consistent min-height */}
        <h3 className="text-base font-bold text-foreground line-clamp-2 min-h-[2.75rem] leading-snug group-hover:text-primary transition-colors">
          {batch.name}
        </h3>

        {/* Description clamped to 2 lines with consistent min-height */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] leading-relaxed">
          {batch.description || 'Comprehensive curriculum covering all syllabus components with structured exams.'}
        </p>

        {/* Meta Row: Fee, Schedule, Branch */}
        <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-medium">Fee:</span>
            <span className="text-sm font-bold text-foreground">{formattedFee}</span>
          </div>

          {batch.schedule && (
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{batch.schedule}</span>
            </div>
          )}

          {batch.branchName && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{batch.branchName}</span>
            </div>
          )}
        </div>

        {/* Full-width button pinned to bottom */}
        <div className="mt-auto pt-3">
          <Button
            asChild
            variant="outline"
            size="md"
            className="w-full font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
          >
            <Link href={targetHref}>View Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function BatchCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        'flex flex-col h-full w-full overflow-hidden border border-border bg-surface',
        className
      )}
    >
      {/* 16/10 Fixed-Aspect Image Container Skeleton */}
      <div className="relative aspect-[16/10] w-full bg-muted">
        <Skeleton className="h-full w-full rounded-none" />
      </div>

      {/* Card Body Skeleton */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        {/* Rating and Subject Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Title clamped to 2 lines Skeleton (min-h-[2.75rem]) */}
        <div className="space-y-1.5 min-h-[2.75rem]">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Description clamped to 2 lines Skeleton (min-h-[2rem]) */}
        <div className="space-y-1 min-h-[2rem]">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>

        {/* Meta Row Skeleton */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>

        {/* Pinned Button Skeleton */}
        <div className="mt-auto pt-3">
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
        </div>
      </div>
    </Card>
  );
}

export function BatchCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch',
        className
      )}
    >
      {children}
    </div>
  );
}
