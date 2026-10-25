'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { apiPost, ApiError } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIdentifierError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setIdentifierError('Please enter your phone number, student ID, or registered email.');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/auth/forgot-password', {
        identifier: trimmed,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many reset requests. Please wait a few minutes and try again.');
      } else {
        // Obfuscate whether account exists to prevent account enumeration
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="border border-border/80 bg-surface shadow-card rounded-[var(--radius-card)]">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Reset password
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
            Enter the phone number, student ID or email registered with your center.
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-4">
          {submitted ? (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MailCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Instructions Sent
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    If an account matches that identifier with an active email on file, instructions to reset your password have been sent. Please check your inbox and spam folder.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild variant="primary" className="h-11 w-full text-xs font-semibold">
                  <Link href="/login" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Back to sign in</span>
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Phone, student ID or email
                  </label>
                  <div className="relative">
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      inputMode="text"
                      required
                      disabled={loading}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                      }}
                      placeholder="01XXXXXXXXX or student ID"
                      aria-invalid={identifierError ? 'true' : undefined}
                      aria-describedby={identifierError ? 'identifier-error' : undefined}
                      className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {identifierError && (
                    <p id="identifier-error" className="text-xs text-danger font-medium mt-1">
                      {identifierError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="h-11 w-full font-semibold shadow-xs transition-all mt-1"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                      <span>Sending link...</span>
                    </span>
                  ) : (
                    <span>Send reset link</span>
                  )}
                </Button>
              </form>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Back to sign in</span>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-5 text-center text-xs text-muted-foreground px-2">
        Students without an email address may request a temporary password from their branch administrator.
      </p>
    </div>
  );
}
