'use client';

import * as React from 'react';
import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function useZodForm<TFieldValues extends FieldValues = FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
  options?: Omit<UseFormProps<TFieldValues>, 'resolver'>
): UseFormReturn<TFieldValues> {
  return useForm<TFieldValues>({
    ...options,
    resolver: zodResolver(schema) as unknown as UseFormProps<TFieldValues>['resolver'],
    mode: 'onBlur',
  });
}

export interface FormStatusProps {
  status?: {
    type: 'success' | 'error' | 'info';
    message: string;
  } | null;
  onDismiss?: () => void;
  className?: string;
}

export function FormStatus({ status, onDismiss, className }: FormStatusProps) {
  if (!status) return null;

  const styles = {
    success: 'bg-secondary-subtle border-secondary/30 text-secondary',
    error: 'bg-danger-subtle border-danger/30 text-danger',
    info: 'bg-primary-subtle border-primary/30 text-primary',
  };

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />,
    error: <AlertCircle className="h-4 w-4 shrink-0 text-danger" />,
    info: <AlertCircle className="h-4 w-4 shrink-0 text-primary" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between rounded-[var(--radius-control)] border p-3 text-sm font-medium animate-in fade-in duration-150',
        styles[status.type],
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {icons[status.type]}
        <span>{status.message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export interface SubmitHandlerOptions<TData, TResult> {
  action: (data: TData) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  successMessage?: string;
  errorMessageFallback?: string;
  setFormError?: (error: string | null) => void;
  setFormSuccess?: (success: string | null) => void;
}

export function createSubmitHandler<TData, TResult>({
  action,
  onSuccess,
  successMessage,
  errorMessageFallback = 'An unexpected error occurred. Please try again.',
  setFormError,
  setFormSuccess,
}: SubmitHandlerOptions<TData, TResult>) {
  return async (data: TData): Promise<boolean> => {
    setFormError?.(null);
    setFormSuccess?.(null);

    try {
      const result = await action(data);
      if (successMessage) {
        toast.success(successMessage);
        setFormSuccess?.(successMessage);
      }
      onSuccess?.(result);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : errorMessageFallback;

      toast.error(message);
      setFormError?.(message);
      return false;
    }
  };
}
