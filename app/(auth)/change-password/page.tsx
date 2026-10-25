'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
  Check,
} from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isForced = user?.mustChangePassword ?? true;

  // Validation checklist
  const isMinLength = newPassword.length >= 10;
  const isDifferentFromCurrent = !!(newPassword && currentPassword && newPassword !== currentPassword);
  const isMatching = !!(newPassword && confirmPassword && newPassword === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current or temporary password.');
      return;
    }
    if (!isMinLength) {
      setError('New password must be at least 10 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      await refreshUser();
      toast.success('Your password has been updated securely.');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to change password. Please check your current password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="border border-border/80 bg-surface shadow-card rounded-[var(--radius-card)]">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isForced ? 'Set new password' : 'Change password'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
            {isForced
              ? 'For your security, set a new password before continuing.'
              : 'Update your password to keep your coaching center account secure.'}
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-4">
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
            {/* Field 1: Current / Temporary Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="block text-xs font-semibold text-foreground"
              >
                {isForced ? 'Temporary / current password' : 'Current password'}
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current or temporary password"
                  className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-background pl-3.5 pr-11 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={loading}
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  aria-pressed={showCurrentPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Field 2: New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold text-foreground"
              >
                New password
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
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
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

            {/* Field 3: Confirm New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-foreground"
              >
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

            {/* Password strength hint and rule checklist */}
            <div className="rounded-[var(--radius-control)] bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5 border border-border/60">
              <span className="font-semibold text-foreground block">Password requirements:</span>
              <ul className="space-y-1">
                <li className={`flex items-center gap-1.5 ${isMinLength ? 'text-secondary font-medium' : ''}`}>
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isMinLength ? 'text-secondary' : 'opacity-30'}`} aria-hidden="true" />
                  <span>At least 10 characters long</span>
                </li>
                <li className={`flex items-center gap-1.5 ${isDifferentFromCurrent ? 'text-secondary font-medium' : ''}`}>
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isDifferentFromCurrent ? 'text-secondary' : 'opacity-30'}`} aria-hidden="true" />
                  <span>Different from your current password</span>
                </li>
                <li className={`flex items-center gap-1.5 ${isMatching ? 'text-secondary font-medium' : ''}`}>
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isMatching ? 'text-secondary' : 'opacity-30'}`} aria-hidden="true" />
                  <span>Matching confirmation password</span>
                </li>
              </ul>
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
                  <span>Saving new password...</span>
                </span>
              ) : (
                <span>Save and continue</span>
              )}
            </Button>
          </form>

          {/* Sign out link for forced change password flow */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => logout()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-danger transition-colors py-1 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
