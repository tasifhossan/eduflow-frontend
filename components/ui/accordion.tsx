'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultExpanded = [],
  className,
}: AccordionProps) {
  const [expandedIds, setExpandedIds] = React.useState<string[]>(defaultExpanded);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const isAlreadyExpanded = prev.includes(id);
      if (allowMultiple) {
        return isAlreadyExpanded ? prev.filter((i) => i !== id) : [...prev, id];
      }
      return isAlreadyExpanded ? [] : [id];
    });
  };

  return (
    <div className={cn('divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden', className)}>
      {items.map((item) => {
        const isExpanded = expandedIds.includes(item.id);
        const headerId = `accordion-header-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id} className="transition-colors">
            <h3>
              <button
                id={headerId}
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180 text-primary'
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>

            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-200"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
