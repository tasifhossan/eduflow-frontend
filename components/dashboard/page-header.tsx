import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`space-y-2 pb-6 border-b border-border ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-medium text-foreground' : ''} aria-current={isLast ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="h-10 w-10 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
