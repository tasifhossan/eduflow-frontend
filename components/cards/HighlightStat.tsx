import * as React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';

export interface HighlightStatProps {
  value: string;
  label: string;
  className?: string;
}

export function HighlightStat({ value, label, className }: HighlightStatProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center border border-border bg-surface shadow-card transition-all duration-200',
        className
      )}
    >
      <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight">
        {value}
      </div>
      <div className="mt-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
        {label}
      </div>
    </Card>
  );
}
