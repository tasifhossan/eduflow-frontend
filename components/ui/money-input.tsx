'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { useCenter } from '@/components/providers/center-provider';

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  currencySymbol?: string;
  isError?: boolean;
}

/**
 * Clean and format monetary input text to ensure digits and at most one decimal point with max 2 decimals.
 */
function sanitizeMoneyInput(val: string): string {
  // Disallow scientific notation, signs, letters
  let cleaned = val.replace(/[^0-9.]/g, '');

  // Only allow a single decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // Cap decimals at 2
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    const intPart = cleaned.slice(0, dotIndex);
    const decPart = cleaned.slice(dotIndex + 1, dotIndex + 3);
    cleaned = intPart + '.' + decPart;
  }

  return cleaned;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      currencySymbol,
      isError,
      disabled,
      className,
      placeholder = '0.00',
      id,
      ...props
    },
    ref
  ) => {
    let symbol = currencySymbol;
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { center } = useCenter();
      if (!symbol) {
        symbol = center.currencySymbol || center.currency;
      }
    } catch {
      // Fallback if rendered outside CenterProvider
      if (!symbol) symbol = '';
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeMoneyInput(e.target.value);
      onChange(sanitized);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent scientific notation 'e', 'E', '+', '-'
      if (['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const sanitized = sanitizeMoneyInput(pasted);
      onChange(sanitized);
    };

    return (
      <div className="relative flex w-full items-center">
        {symbol && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 select-none text-sm font-medium text-muted-foreground"
          >
            {symbol}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-invalid={isError ? true : undefined}
          className={cn(
            'flex h-10 min-h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-surface py-2 pr-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
            symbol ? 'pl-8' : 'px-3',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            isError &&
              'border-status-danger text-foreground focus-visible:border-status-danger focus-visible:ring-status-danger/30',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';
