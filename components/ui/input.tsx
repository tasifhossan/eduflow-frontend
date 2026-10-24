import * as React from 'react';
import { cn } from '@/lib/cn';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
  isSuccess?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      isError,
      isSuccess,
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password' || showPasswordToggle;
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={computedType}
          disabled={disabled}
          aria-invalid={isError ? true : undefined}
          className={cn(
            'flex h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            isError &&
              'border-danger text-foreground focus-visible:border-danger focus-visible:ring-danger/30',
            isSuccess &&
              'border-secondary focus-visible:border-secondary focus-visible:ring-secondary/30',
            isPassword && 'pr-10',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
