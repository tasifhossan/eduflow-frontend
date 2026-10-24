'use client';

import * as React from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface FaqApiItem {
  id: string;
  question: string;
  answer: string;
}

export function HomeFaq() {
  const { data, loading, error } = useApi<{ items?: FaqApiItem[] } | FaqApiItem[]>(
    '/api/faq'
  );

  if (loading || error) {
    return null;
  }

  const items = Array.isArray(data) ? data : data?.items || [];
  if (items.length === 0) {
    return null;
  }

  const top6 = items.slice(0, 6);
  const accordionItems: AccordionItem[] = top6.map((item) => ({
    id: item.id,
    title: item.question,
    content: <p>{item.answer}</p>,
  }));

  return (
    <Section
      title="Frequently Asked Questions"
      subtitle="Quick answers to common questions about admissions, exams, and routines."
      className="bg-background border-b border-border/60"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <Accordion items={accordionItems} />

        {items.length > 6 && (
          <div className="text-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/faq" className="inline-flex items-center gap-1.5">
                <span>View all questions</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
