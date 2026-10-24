import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className,
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumbs" className={cn('flex items-center text-xs', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="flex items-center gap-1.5">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" aria-hidden="true" />
          </li>
        )}

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <li key={idx} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-medium text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-foreground truncate max-w-[200px]"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight
                  className="h-3 w-3 text-muted-foreground/60 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
