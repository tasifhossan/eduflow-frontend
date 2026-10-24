import * as React from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm border border-transparent',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm border border-transparent',
      accent:
        'bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm border border-transparent font-semibold',
      outline:
        'border border-border bg-surface text-foreground hover:bg-surface-hover hover:border-border-hover shadow-sm',
      ghost:
        'bg-transparent text-foreground hover:bg-surface-hover hover:text-foreground',
      danger:
        'bg-danger text-danger-foreground hover:bg-danger-hover shadow-sm border border-transparent',
      link:
        'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto active:scale-100',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs rounded-[var(--radius-control)] gap-1.5',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-control)] gap-2',
      lg: 'h-12 px-6 text-base rounded-[var(--radius-control)] gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-[var(--radius-control)] justify-center',
    };

    const combinedClassName = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string;
        children?: React.ReactNode;
        'aria-busy'?: boolean;
        'aria-disabled'?: boolean;
      }>;
      return React.cloneElement(child, {
        className: cn(combinedClassName, child.props.className),
        'aria-busy': isLoading ? true : undefined,
        'aria-disabled': disabled || isLoading ? true : undefined,
        children: (
          <>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-1.5" aria-hidden="true" />
            )}
            {child.props.children}
          </>
        ),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
