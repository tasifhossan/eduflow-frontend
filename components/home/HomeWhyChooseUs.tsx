import * as React from 'react';
import { WhyChooseUsItem } from '@/lib/types/center';
import { IconFeatureCard } from '@/components/cards/IconFeatureCard';
import { Section } from '@/components/ui/section';

export interface HomeWhyChooseUsProps {
  items?: WhyChooseUsItem[];
}

export function HomeWhyChooseUs({ items }: HomeWhyChooseUsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // Clamped to max 6 items
  const features = items.slice(0, 6);

  return (
    <Section
      title="Why Choose Us"
      subtitle="Proven methodology, dedicated mentorship, and an ecosystem built for academic excellence."
      className="bg-surface/50 border-t border-b border-border/60"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {features.map((feature, idx) => (
          <IconFeatureCard
            key={`${feature.title}-${idx}`}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
          />
        ))}
      </div>
    </Section>
  );
}
