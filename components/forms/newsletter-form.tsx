'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/components/ui/form-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';
import { CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';

const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  website: z.string().optional(), // Honeypot field
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

export interface NewsletterFormProps {
  className?: string;
  variant?: 'footer' | 'card';
}

export function NewsletterForm({ className, variant = 'footer' }: NewsletterFormProps) {
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm<NewsletterFormData>(newsletterSchema, {
    defaultValues: {
      email: '',
      website: '',
    },
  });

  const onSubmit = async (data: NewsletterFormData) => {
    // If honeypot filled out by bot, resolve silently without calling API
    if (data.website && data.website.trim() !== '') {
      setStatus({ type: 'success', message: "You're subscribed" });
      reset();
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await apiPost<{ success: boolean; message: string }>('/api/newsletter', {
        email: data.email,
      });

      if (res && res.success) {
        setStatus({ type: 'success', message: "You're subscribed" });
        reset();
      } else {
        setStatus({
          type: 'error',
          message: res?.message || 'Failed to subscribe. Please try again.',
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to subscribe to newsletter right now. Please try again later.';
      setStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {/* Hidden Honeypot Field */}
        <div className="hidden" aria-hidden="true" tabIndex={-1}>
          <label htmlFor="newsletter-website">Website</label>
          <input
            id="newsletter-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              placeholder="Enter your email address"
              aria-label="Email address for newsletter"
              disabled={isSubmitting}
              className={cn(
                'pl-10 h-11 bg-surface text-foreground placeholder:text-muted-foreground border-border',
                variant === 'footer' && 'bg-surface/80',
                errors.email && 'border-danger'
              )}
              {...register('email')}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="h-11 px-6 shrink-0 font-semibold shadow-sm"
          >
            Subscribe
          </Button>
        </div>

        {/* Validation or API Status Messages */}
        {errors.email && (
          <div
            role="alert"
            className="flex items-center gap-1.5 text-xs text-danger font-medium animate-in fade-in duration-150"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{errors.email.message}</span>
          </div>
        )}

        {status && (
          <div
            role={status.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-center gap-2 rounded-[var(--radius-control)] p-2.5 text-xs font-semibold animate-in fade-in duration-150',
              status.type === 'success'
                ? 'bg-secondary-subtle border border-secondary/30 text-secondary'
                : 'bg-danger-subtle border border-danger/30 text-danger'
            )}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}
