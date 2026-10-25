'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isForced = user?.mustChangePassword ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current or temporary password.');
      return;
    }
    if (newPassword.length < 10) {
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
    <div className="flex flex-1 min-h-[calc(100vh-16rem)] flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-tight text-primary">EduFlow</span>
          </Link>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {isForced ? 'Set New Password' : 'Change Password'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              {isForced
                ? 'Your account was provisioned with a temporary password. Please set a secure personal password to continue.'
                : 'Update your password to keep your coaching center account secure.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
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
                  htmlFor="currentPassword"
                  className="block text-xs font-semibold text-foreground"
                >
                  {isForced ? 'Temporary / Current Password' : 'Current Password'}
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    showPasswordToggle
                    disabled={loading}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current or temporary password"
                    className="pl-9 text-sm"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-foreground"
                >
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
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-foreground"
                >
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
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="rounded-[var(--radius-control)] bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1 border border-border/50">
                <p className="font-semibold text-foreground">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={newPassword.length >= 10 ? 'text-primary font-medium' : ''}>
                    At least 10 characters long
                  </li>
                  <li className={newPassword && newPassword !== currentPassword ? 'text-primary font-medium' : ''}>
                    Different from your current password
                  </li>
                  <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-primary font-medium' : ''}>
                    Matching confirmation password
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="w-full font-semibold shadow-sm mt-2"
              >
                Save and Continue
              </Button>
            </form>

            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-xs text-muted-foreground hover:text-danger gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
