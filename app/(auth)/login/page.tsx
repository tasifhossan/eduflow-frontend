'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Phone,
  MessageCircle,
  ArrowUp,
} from 'lucide-react';

const DevShortcuts =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_SHORTCUTS === 'true'
    ? dynamic(() => import('./dev-shortcuts'), { ssr: false })
    : null;

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
  const { center } = useCenter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Autofocus on desktop only (>= 1024px)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      identifierInputRef.current?.focus();
    }
  }, []);

  // Countdown timer for 429 rate limit
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIdentifierError(null);
    setPasswordError(null);

    const trimmed = identifier.trim();
    let hasValidationError = false;

    if (!trimmed) {
      setIdentifierError('Please enter your phone number, student ID, or email.');
      hasValidationError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      setError('Please fill in all required fields.');
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
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const retry = err.retryAfter || 60;
          setCountdown(retry);
          setError(`Too many attempts. Please wait a few minutes and try again.`);
          return;
        }
        setError(err.message || 'Invalid credentials. Please verify and try again.');
        return;
      }

      if (err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('fetch'))) {
        setError('Network error. Unable to connect to server. Please check your internet connection and try again.');
        return;
      }

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

  // WhatsApp formatted link
  const waDigits = center.whatsapp?.replace(/\D/g, '') || '';

  return (
    <div className="w-full">
      <Card className="border border-border/80 bg-surface shadow-card rounded-[var(--radius-card)]">
        <CardHeader className="space-y-1.5 p-6 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
            Sign in with the phone number, student ID or email your center gave you.
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-4">
          {/* Accessible Error Alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 leading-relaxed">
                <span>{error}</span>
                {countdown > 0 && (
                  <span className="block mt-1 font-semibold">
                    Retry available in {countdown} seconds.
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Field 1: Phone, Student ID, or Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold text-foreground"
              >
                Phone, student ID or email
              </label>
              <div className="relative">
                <input
                  ref={identifierInputRef}
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  inputMode="text"
                  required
                  disabled={loading || countdown > 0}
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

            {/* Field 2: Password with show/hide button & Caps Lock indicator */}
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
                  className="text-xs font-medium text-primary hover:text-primary-hover hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={loading || countdown > 0}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  placeholder="Enter your password"
                  aria-invalid={passwordError ? 'true' : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="flex h-11 w-full rounded-[var(--radius-control)] border border-border bg-background pl-3.5 pr-11 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || countdown > 0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {capsLockOn && (
                <div
                  role="status"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1"
                >
                  <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Caps Lock is on</span>
                </div>
              )}

              {passwordError && (
                <p id="password-error" className="text-xs text-danger font-medium mt-1">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={loading || countdown > 0}
              className="h-11 w-full font-semibold shadow-xs transition-all mt-1"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>Signing in...</span>
                </span>
              ) : countdown > 0 ? (
                <span>Wait {countdown}s to retry</span>
              ) : (
                <span>Sign in</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Help text below the card */}
      <div className="mt-5 text-center text-xs text-muted-foreground px-2">
        <p>
          Need an account or can&apos;t sign in? Ask your center&apos;s office.
        </p>
        {(center.contactPhone || waDigits) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
            {center.contactPhone ? (
              <a
                href={`tel:${center.contactPhone}`}
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                <Phone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{center.contactPhone}</span>
              </a>
            ) : null}

            {waDigits ? (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            ) : null}
          </div>
        )}
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-foreground underline underline-offset-4">
            Terms of Service
          </Link>
        </div>
      </div>

      {/* Optional dev login helpers */}
      {DevShortcuts && (
        <DevShortcuts
          loading={loading}
          countdown={countdown}
          onDemoLogin={handleDemoLogin}
        />
      )}
    </div>
  );
}
