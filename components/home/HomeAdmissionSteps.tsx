import * as React from 'react';
import { AdmissionStepItem } from '@/lib/types/center';
import { Section } from '@/components/ui/section';
import { Card } from '@/components/ui/card';

export interface HomeAdmissionStepsProps {
  steps?: AdmissionStepItem[];
}

export function HomeAdmissionSteps({ steps }: HomeAdmissionStepsProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  // Clamped to max 5 steps
  const items = steps.slice(0, 5);

  return (
    <Section
      title="How to Enrol"
      subtitle="Simple and transparent admission process to kickstart your preparation journey."
      className="border-b border-border/60"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
        {items.map((step, idx) => (
          <Card
            key={`${step.title}-${idx}`}
            className="relative flex flex-col p-6 border border-border bg-surface text-foreground shadow-card transition-all duration-200"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-primary text-primary-foreground text-sm font-extrabold mb-4 shadow-sm">
              {idx + 1}
            </div>
            <h3 className="text-base font-bold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
              {step.description}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
