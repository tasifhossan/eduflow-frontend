import * as React from 'react';
import { HighlightItem } from '@/lib/types/center';
import { HighlightStat } from '@/components/cards/HighlightStat';
import { Container } from '@/components/ui/container';

export interface HomeHighlightsProps {
  highlights?: HighlightItem[];
}

export function HomeHighlights({ highlights }: HomeHighlightsProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  // Clamped to max 4 items as per specification
  const items = highlights.slice(0, 4);

  return (
    <section className="py-10 md:py-14 bg-surface border-b border-border/60">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {items.map((item, idx) => (
            <HighlightStat
              key={`${item.label}-${idx}`}
              value={item.value}
              label={item.label}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
