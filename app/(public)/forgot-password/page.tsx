'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, ArrowLeft, MailCheck, AlertCircle, User } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your phone number, student ID, or registered email.');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/auth/forgot-password', {
        identifier: trimmed,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      // Even on error, show the confirmation screen unless it's a rate limit error
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Too many') || msg.includes('429')) {
        setError('Too many reset requests. Please try again later.');
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-16rem)] flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-tight text-primary">EduFlow</span>
          </Link>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Reset Password
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your login identifier to request a password reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {submitted ? (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MailCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      Instructions Sent
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      If an account matches that identifier with an active email on file, instructions to reset your password have been sent. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild variant="outline" size="md" className="w-full text-xs">
                    <Link href="/login" className="flex items-center justify-center gap-1.5">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Sign In
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
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="identifier"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Phone, student ID or email
                    </label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        name="identifier"
                        type="text"
                        autoComplete="username"
                        required
                        disabled={loading}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. 01712345678 or student@domain.com"
                        className="pl-9 text-sm"
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={loading}
                    className="w-full font-semibold shadow-sm mt-2"
                  >
                    Send Reset Link
                  </Button>
                </form>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Students without an email address may also request a temporary password from their branch administrator.
        </p>
      </div>
    </div>
  );
}
