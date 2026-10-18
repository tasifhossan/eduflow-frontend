import * as React from 'react';
import { cn } from '@/lib/cn';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  success?: string;
  className?: string;
  children:
    | React.ReactNode
    | ((props: {
        id: string;
        isError: boolean;
        isSuccess: boolean;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
      }) => React.ReactNode);
}

export function FormField({
  id: explicitId,
  label,
  required,
  hint,
  error,
  success,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId();
  const id = explicitId || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const successId = `${id}-success`;

  const isError = Boolean(error);
  const isSuccess = Boolean(success && !error);

  const describedBy = [
    hint ? hintId : null,
    isError ? errorId : null,
    isSuccess ? successId : null,
  ]
    .filter(Boolean)
    .join(' ');

  const childProps = {
    id,
    isError,
    isSuccess,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': isError ? true : undefined,
  };

  const clonedProps = {
    id: (React.isValidElement(children) && (children.props as { id?: string }).id) || id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': isError ? true : undefined,
    isError,
    isSuccess,
  };

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
            {required && (
              <span className="text-danger ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
      )}

      {typeof children === 'function'
        ? children(childProps)
        : React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            clonedProps
          )
        : children}

      {hint && !error && !success && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-danger font-medium mt-1 animate-in fade-in duration-150"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {success && !error && (
        <div
          id={successId}
          role="status"
          className="flex items-center gap-1.5 text-xs text-secondary font-medium mt-1 animate-in fade-in duration-150"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
