'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  CalendarCheck,
  Award,
  Receipt,
  Bell,
  Clock,
} from 'lucide-react';
import { useCenter } from '@/components/providers/center-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface AuthShellProps {
  children: React.ReactNode;
}

const PORTAL_BENEFITS = [
  {
    icon: CalendarCheck,
    title: 'Attendance tracking',
    description: 'Real-time entry & exit records',
  },
  {
    icon: Award,
    title: 'Exam results & ranks',
    description: 'Scorecards, performance analytics & rankings',
  },
  {
    icon: Receipt,
    title: 'Fee statements & receipts',
    description: 'Online invoices and complete payment history',
  },
  {
    icon: Bell,
    title: 'Notices & announcements',
    description: 'Instant official updates directly from faculty',
  },
  {
    icon: Clock,
    title: 'Class routine & schedule',
    description: 'Daily schedules, batch timings and room allocations',
  },
];

export function AuthShell({ children }: AuthShellProps) {
  const { center, features } = useCenter();
  const { user } = useAuth();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const isChangePasswordPage = pathname === '/change-password';
  const isForcedPasswordChange = isChangePasswordPage && (user?.mustChangePassword ?? true);

  // Show "Back to website" only if publicSite is enabled and not trapped in forced change password
  const showBackToSite = features.publicSite !== false && !isForcedPasswordChange;

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
      {/* =========================================================================
          LEFT BRAND PANEL (Desktop lg and up: equal height, min-h-dvh)
          ========================================================================= */}
      <aside
        aria-label="Brand Overview"
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-12 relative overflow-hidden bg-primary text-primary-foreground border-r border-border/20 select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 85% 85%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
            linear-gradient(155deg, rgba(255, 255, 255, 0.06) 0%, transparent 45%, rgba(0, 0, 0, 0.14) 100%)
          `,
        }}
      >
        {/* Subtle decorative grid overlay via CSS gradients */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Top: Center Brand Info */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-4">
            {center.logoUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-white/10 p-1.5 shadow-sm border border-white/20">
                <Image
                  src={center.logoUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-white/15 text-primary-foreground font-bold text-2xl shadow-sm border border-white/20">
                {center.shortName?.[0] || center.name?.[0] || 'C'}
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-1">
              <span className="block font-bold text-2xl xl:text-3xl tracking-tight leading-tight break-words hyphens-auto">
                {center.name}
              </span>
              {center.tagline ? (
                <p className="text-xs xl:text-sm text-primary-foreground/80 leading-relaxed break-words">
                  {center.tagline}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Middle: Short factual list of what the portal gives people */}
        <div className="relative z-10 my-8 xl:my-10 space-y-4 max-w-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/75 mb-2">
            Portal Access &amp; Services
          </div>

          <div className="space-y-3.5">
            {PORTAL_BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-white/10 border border-white/15 text-primary-foreground shadow-xs">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-sm font-semibold text-primary-foreground leading-snug">
                      {item.title}
                    </div>
                    <div className="text-xs text-primary-foreground/75 leading-tight">
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Copyright & Center Name */}
        <div className="relative z-10 pt-4 border-t border-white/15 text-xs text-primary-foreground/70 flex items-center justify-between">
          <span>&copy; {currentYear} {center.name}</span>
          <span className="text-[11px] opacity-75">Student &amp; Staff Portal</span>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT COLUMN: Form, Controls, Mobile Header & Minimal Footer
          ========================================================================= */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 flex flex-col justify-between min-h-dvh p-4 sm:p-6 lg:p-8 relative bg-background focus:outline-none"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(var(--primary-rgb), 0.06), transparent 75%)`,
        }}
      >
        {/* Top utility row: Back to website (left) + Theme toggle (right) */}
        <div className="w-full flex items-center justify-between gap-4 h-10">
          <div>
            {showBackToSite ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-surface"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to website</span>
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" variant="ghost" />
          </div>
        </div>

        {/* Center Area: Form Card (vertically centered, max-w-md) */}
        <div className="my-auto w-full max-w-md mx-auto py-4 sm:py-6">
          {/* Mobile and Tablet Header (< lg): compact logo + center name, centered */}
          <div className="lg:hidden mb-6 flex flex-col items-center text-center">
            {center.logoUrl ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface p-1 border border-border shadow-xs mb-2">
                <Image
                  src={center.logoUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold text-xl shadow-xs mb-2">
                {center.shortName?.[0] || center.name?.[0] || 'C'}
              </div>
            )}
            <span className="font-bold text-lg text-foreground tracking-tight break-words hyphens-auto px-2">
              {center.name}
            </span>
            {center.tagline ? (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs break-words">
                {center.tagline}
              </p>
            ) : null}
          </div>

          {/* Children: Auth Card (one h1, form fields, action buttons) */}
          {children}
        </div>

        {/* Minimal Footer under the form */}
        <footer className="mt-auto w-full max-w-md mx-auto pt-4 pb-2 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>&copy; {currentYear} {center.name}</span>
            <span className="text-border" aria-hidden="true">&bull;</span>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Privacy
            </Link>
            <span className="text-border" aria-hidden="true">&bull;</span>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Terms
            </Link>
            {features.showPoweredBy !== false && (
              <>
                <span className="text-border" aria-hidden="true">&bull;</span>
                <span className="text-muted-foreground/80">
                  Powered by <span className="font-medium text-foreground">EduFlow</span>
                </span>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
