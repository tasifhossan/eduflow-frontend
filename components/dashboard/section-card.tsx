import * as React from 'react';

export interface SectionCardProps {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 sm:px-6 py-4 border-b border-border gap-2">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground tracking-tight truncate">
                {title}
              </h2>
            ) : (
              title
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className={noPadding ? '' : 'p-5 sm:p-6'}>
        {children}
      </div>

      {footer && (
        <div className="border-t border-border bg-surface-hover/30 px-5 sm:px-6 py-3 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}
