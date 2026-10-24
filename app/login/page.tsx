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
import { AlertCircle, Lock, User, Sparkles } from 'lucide-react';

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    mustChangePassword?: boolean;
    user?: {
      id: string;
      name: string;
      role: string;
      mustChangePassword?: boolean;
    };
  };
  mustChangePassword?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your phone number, student ID, or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiPost<LoginResponse>('/api/auth/login', {
        identifier: trimmed,
        password,
      });

      const mustChange =
        res.data?.mustChangePassword ??
        res.mustChangePassword ??
        res.data?.user?.mustChangePassword;

      await refreshUser();

      if (mustChange) {
        toast.info('Initial password change required before accessing the system.');
        router.push('/change-password');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'GUARDIAN') => {
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/auth/demo', { role });
      await refreshUser();
      toast.success(`Signed in as Demo ${role}`);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-tight text-primary">EduFlow</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Multi-Branch Coaching Center Management Platform
          </p>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Sign in to EduFlow
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Access is provisioned by coaching center staff. Use your phone number, student ID, or registered email.
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
                    placeholder="e.g. 01712345678, MIR-26-0001, or name@domain.com"
                    className="pl-9 text-sm"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:text-primary-hover hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    showPasswordToggle
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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
                Sign in
              </Button>
            </form>

            {process.env.NODE_ENV !== 'production' && (
              <div className="pt-4 border-t border-border mt-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dev Demo Fast Logins
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    id="demo-student-login-btn"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDemoLogin('STUDENT')}
                    className="text-xs justify-start h-8"
                  >
                    Student
                  </Button>
                  <Button
                    type="button"
                    id="demo-teacher-login-btn"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDemoLogin('TEACHER')}
                    className="text-xs justify-start h-8"
                  >
                    Teacher
                  </Button>
                  <Button
                    type="button"
                    id="demo-admin-login-btn"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDemoLogin('ADMIN')}
                    className="text-xs justify-start h-8"
                  >
                    Branch Admin
                  </Button>
                  <Button
                    type="button"
                    id="demo-guardian-login-btn"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDemoLogin('GUARDIAN')}
                    className="text-xs justify-start h-8"
                  >
                    Guardian
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need an account? Please contact your coaching center branch office to be provisioned.
        </p>
      </div>
    </div>
  );
}
