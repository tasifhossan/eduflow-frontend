'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/components/ui/form-helpers';
import { apiPost, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { isValidBangladeshiPhone } from '@/lib/format';
import { Section } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PhoneCall, AlertCircle, RotateCcw } from 'lucide-react';

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .refine((val) => isValidBangladeshiPhone(val), {
      message: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)',
    }),
  interestedBatchId: z.string().optional(),
  interestedGrade: z.string().trim().max(40, 'Grade cannot exceed 40 characters').optional(),
  message: z.string().trim().max(1000, 'Message cannot exceed 1000 characters').optional(),
  website: z.string().optional(), // Honeypot field
});

type EnquiryFormData = z.infer<typeof enquirySchema>;

export function HomeEnquiryForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Fetch published batches for the optional course select dropdown
  const { data: batchesRes } = useApi<{ items?: Array<{ id: string; name: string }> }>(
    '/api/public/batches?limit=24'
  );
  const publishedBatches = batchesRes?.items || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm<EnquiryFormData>(enquirySchema, {
    defaultValues: {
      name: '',
      phone: '',
      interestedBatchId: '',
      interestedGrade: '',
      message: '',
      website: '',
    },
  });

  const onSubmit = async (values: EnquiryFormData) => {
    setServerError(null);
    try {
      await apiPost('/api/contact', {
        name: values.name,
        phone: values.phone,
        interestedBatchId: values.interestedBatchId || undefined,
        interestedGrade: values.interestedGrade || undefined,
        message: values.message || undefined,
        website: values.website || undefined,
        source: 'WEBSITE',
      });
      setSubmitted(true);
      reset();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setServerError(
          'You have reached the maximum number of enquiry submissions. Please try again in a little while or call our helpline directly.'
        );
      } else {
        setServerError(err.message || 'Failed to submit enquiry. Please check your network and try again.');
      }
    }
  };

  return (
    <Section
      id="enquire"
      title="Request a Call Back"
      subtitle="Leave your contact details and our academic admissions team will call you back to assist with batch selection and fees."
      className="bg-surface/50 border-b border-border/60"
    >
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 sm:p-8 border border-border bg-surface text-foreground shadow-card">
          {submitted ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-pill)] bg-secondary/15 text-secondary">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Thank you. We will call you soon.
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your admission enquiry has been logged with our admissions desk. A coordinator will get in touch during working hours.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                  className="font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  <span>Submit another enquiry</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger-subtle p-3 text-xs sm:text-sm font-medium text-danger"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Honeypot field - visually hidden */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('website')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Student / Guardian Name"
                  required
                  error={errors.name?.message}
                >
                  <Input
                    placeholder="e.g. Tanvir Ahmed"
                    disabled={isSubmitting}
                    {...register('name')}
                  />
                </FormField>

                <FormField
                  label="Mobile Phone Number"
                  required
                  hint="11 digits: 01XXXXXXXXX"
                  error={errors.phone?.message}
                >
                  <Input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    disabled={isSubmitting}
                    {...register('phone')}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {publishedBatches.length > 0 && (
                  <FormField
                    label="Interested Course (Optional)"
                    error={errors.interestedBatchId?.message}
                  >
                    <Select disabled={isSubmitting} {...register('interestedBatchId')}>
                      <option value="">Select a batch</option>
                      {publishedBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}

                <FormField
                  label="Class / Grade (Optional)"
                  error={errors.interestedGrade?.message}
                >
                  <Input
                    placeholder="e.g. Class 10 / HSC 1st Year"
                    disabled={isSubmitting}
                    {...register('interestedGrade')}
                  />
                </FormField>
              </div>

              <FormField
                label="Any specific questions? (Optional)"
                error={errors.message?.message}
              >
                <Textarea
                  placeholder="Ask about batch timings, branch location, or admission procedures..."
                  rows={3}
                  disabled={isSubmitting}
                  {...register('message')}
                />
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <PhoneCall className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span>Request Call Back</span>
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
}
