'use client';

import React, { useState, useMemo } from 'react';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { SafeText } from '@/components/content/safe-text';
import { Search, X, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface FaqItemData {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder?: number;
}

export interface FaqViewProps {
  initialItems: FaqItemData[];
  centerName: string;
}

export function FaqView({ initialItems, centerName }: FaqViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Discover distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialItems.forEach((item) => {
      if (item.category?.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [initialItems]);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return initialItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [initialItems, selectedCategory, searchTerm]);

  // Group filtered items by category
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, FaqItemData[]>();

    filteredItems.forEach((item) => {
      const cat = item.category?.trim() || 'General Information';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    });

    return map;
  }, [filteredItems]);

  return (
    <div className="py-8 sm:py-16">
      <Container>
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-3">
          <Badge variant="primary" size="sm">
            Knowledge Base
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Find prompt answers to admissions, class routines, examination structures, and guardian portal guidelines at {centerName}.
          </p>

          {/* Search Box */}
          <div className="relative max-w-lg mx-auto pt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search questions (e.g. admissions, fees, exams)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-9 h-11 text-sm bg-surface shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              All Topics ({initialItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-surface border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="max-w-3xl mx-auto space-y-10">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<HelpCircle className="h-8 w-8 text-muted-foreground/60" />}
              title="No questions match your search"
              description="Try searching with different keywords or browse our contact desk for personalized counseling."
              action={
                <div className="flex gap-2">
                  {searchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </Button>
                  )}
                  <Button asChild variant="primary" size="sm">
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            Array.from(groupedByCategory.entries()).map(([cat, items]) => {
              const accordionItems: AccordionItem[] = items.map((item) => ({
                id: item.id,
                title: item.question,
                content: <SafeText content={item.answer} className="text-sm" />,
              }));

              return (
                <section key={cat} className="space-y-3">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                    <span className="text-primary">&bull;</span>
                    <span>{cat}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </h2>
                  <Accordion items={accordionItems} allowMultiple />
                </section>
              );
            })
          )}

          {/* Need More Help Footer Callout */}
          <div className="p-6 rounded-[var(--radius-card)] border border-border bg-surface-sunken/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-12">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Still have questions?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our admissions officers are here to help you choose the right batch.
              </p>
            </div>
            <Button asChild variant="primary" size="sm" className="gap-1.5 shrink-0">
              <Link href="/contact">
                <span>Reach Out to Us</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
