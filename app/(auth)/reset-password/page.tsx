'use client';

import * as React from 'react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing or invalid reset token. Please request a new password reset link.');
      return;
    }
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to reset password. The reset link may have expired or already been used.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 py-2">
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">
            No reset token found in link. Please use the link sent to your email or request a new one.
          </span>
        </div>
        <Button asChild variant="primary" className="h-11 w-full text-xs font-semibold">
          <Link href="/forgot-password">Request new reset link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5 py-2 text-center">
        <div className="h-12 w-12 rounded-full bg-secondary/15 mx-auto flex items-center justify-center text-secondary">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Password reset successfully</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your password has been securely updated. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild variant="primary" className="h-11 w-full text-xs font-semibold">
            <Link href="/login" className="flex items-center justify-center gap-1.5">
              <span>Proceed to sign in</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 p-3 text-xs text-danger mb-4"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="block text-xs font-semibold text-foreground">
            New password (min 10 characters)
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              disabled={loading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-background pl-3.5 pr-11 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={loading}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showNewPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-foreground">
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-background pl-3.5 pr-11 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              aria-pressed={showConfirmPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
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
              <span>Updating password...</span>
            </span>
          ) : (
            <span>Update password</span>
          )}
        </Button>
      </form>

      <div className="pt-3 text-center">
        <Link
          href="/login"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full">
      <Card className="border border-border/80 bg-surface shadow-card rounded-[var(--radius-card)]">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Set new password
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
            Choose a strong password with at least 10 characters.
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <Suspense fallback={<div className="py-8 text-center text-xs text-muted-foreground">Loading form...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
