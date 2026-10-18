import * as React from 'react';
import { cn } from '@/lib/cn';
import { Star } from 'lucide-react';

export interface RatingProps {
  value: number; // 0 to 5
  max?: number;
  readOnly?: boolean;
  onChange?: (val: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  readOnly = true,
  onChange,
  size = 'md',
  showCount = false,
  count,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const starSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const activeValue = hoverValue !== null ? hoverValue : value;

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating: ${value.toFixed(1)} out of ${max} stars`}
    >
      <div className="flex items-center">
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = activeValue >= starNumber;
          const isHalf = !isFilled && activeValue >= starNumber - 0.5;

          if (readOnly) {
            return (
              <span key={index} className="inline-block p-0.5">
                <Star
                  className={cn(
                    starSizes[size],
                    isFilled
                      ? 'fill-accent text-accent'
                      : isHalf
                      ? 'fill-accent/50 text-accent'
                      : 'text-border stroke-muted-foreground/40'
                  )}
                  aria-hidden="true"
                />
              </span>
            );
          }

          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={value === starNumber}
              aria-label={`${starNumber} star${starNumber > 1 ? 's' : ''}`}
              className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer transition-transform hover:scale-110"
              onClick={() => onChange?.(starNumber)}
              onMouseEnter={() => setHoverValue(starNumber)}
              onMouseLeave={() => setHoverValue(null)}
            >
              <Star
                className={cn(
                  starSizes[size],
                  isFilled
                    ? 'fill-accent text-accent'
                    : 'text-border stroke-muted-foreground/40'
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {showCount && (
        <span className="text-xs text-muted-foreground font-medium ml-1">
          {value.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}
