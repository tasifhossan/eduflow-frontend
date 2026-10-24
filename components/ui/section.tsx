import * as React from 'react';
import { cn } from '@/lib/cn';
import { Container } from './container';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  align?: 'left' | 'center';
  containerSize?: 'sm' | 'md' | 'lg' | 'default';
}

export function Section({
  title,
  subtitle,
  badge,
  align = 'left',
  containerSize = 'default',
  children,
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn('py-14 md:py-20 w-full transition-colors', className)}
      {...props}
    >
      <Container size={containerSize}>
        {(title || subtitle || badge) && (
          <div
            className={cn(
              'mb-10 space-y-2.5',
              align === 'center' ? 'text-center mx-auto max-w-2xl' : 'max-w-3xl'
            )}
          >
            {badge && <div>{badge}</div>}
            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground font-heading">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
