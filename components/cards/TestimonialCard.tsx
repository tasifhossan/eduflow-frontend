import * as React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Rating } from '@/components/ui/rating';
import { Quote } from 'lucide-react';

export interface TestimonialData {
  id: string;
  name: string;
  role?: string | null;
  content: string;
  rating?: number;
  batchName?: string | null;
}

export interface TestimonialCardProps {
  testimonial: TestimonialData;
  className?: string;
}

export function TestimonialCard({ testimonial, className }: TestimonialCardProps) {
  return (
    <Card
      hoverEffect
      className={cn(
        'group flex flex-col justify-between p-6 h-full border border-border bg-surface text-foreground shadow-card transition-all duration-200',
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Rating value={testimonial.rating ?? 5} size="sm" />
          <Quote className="h-5 w-5 text-primary/30" aria-hidden="true" />
        </div>

        <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed line-clamp-4">
          &ldquo;{testimonial.content}&rdquo;
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-border/60">
        <div className="text-xs sm:text-sm font-bold text-foreground">
          {testimonial.name}
        </div>
        {(testimonial.role || testimonial.batchName) && (
          <div className="text-[11px] text-muted-foreground truncate">
            {testimonial.batchName || testimonial.role}
          </div>
        )}
      </div>
    </Card>
  );
}
