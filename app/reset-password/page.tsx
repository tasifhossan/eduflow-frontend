'use client';

import * as React from 'react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            No reset token found in link. Please use the link sent to your email or request a new one.
          </span>
        </div>
        <Button asChild variant="primary" size="md" className="w-full text-xs">
          <Link href="/forgot-password">Request New Reset Link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="h-12 w-12 rounded-full bg-secondary/15 mx-auto flex items-center justify-center text-secondary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-foreground">Password Reset Successfully</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your password has been securely updated. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild variant="primary" size="md" className="w-full text-xs">
            <Link href="/login" className="flex items-center justify-center gap-1.5">
              Proceed to Sign In
              <ArrowRight className="h-3.5 w-3.5" />
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
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="block text-xs font-semibold text-foreground">
            New Password (min 10 characters)
          </label>
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              showPasswordToggle
              disabled={loading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="pl-9 text-sm"
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-foreground">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              showPasswordToggle
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="pl-9 text-sm"
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          className="w-full font-semibold shadow-sm mt-2"
        >
          Update Password
        </Button>
      </form>

      <div className="pt-4 text-center">
        <Link
          href="/login"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 py-12">
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
                Set New Password
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Choose a strong password with at least 10 characters.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <Suspense fallback={<div className="py-8 text-center text-xs text-muted-foreground">Loading reset form...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
