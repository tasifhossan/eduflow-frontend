'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { NavbarAuth } from '@/components/layout/navbar-auth';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/cn';
import {
  ChevronDown,
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { center, features } = useCenter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Filter nav links based on auth state and feature flags
  const rawNavLinks = user ? siteConfig.nav.loggedIn : siteConfig.nav.loggedOut;
  const navLinks = rawNavLinks.filter((item) => {
    if (item.href === '/blog' && !features.blog) return false;
    return true;
  });

  // Resources dropdown items for logged-out navigation
  const resourcesItems: DropdownMenuItem[] = siteConfig.nav.resourcesMenu
    .filter((item) => {
      if (item.href === '/blog' && !features.blog) return false;
      return true;
    })
    .map((item) => {
      const IconComponent = item.iconName ? ICON_MAP[item.iconName] || HelpCircle : HelpCircle;
      return {
        id: item.href + item.label,
        label: item.label,
        description: item.description,
        icon: <IconComponent className="h-4 w-4" />,
        onClick: () => router.push(item.href),
      };
    });

  const showNavLinks = user || features.publicSite;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,border-color,box-shadow] duration-200',
        'bg-surface/90 backdrop-blur-md',
        isScrolled
          ? 'border-b border-border shadow-xs'
          : 'border-b border-transparent'
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[var(--radius-control)] py-1"
            aria-label={`${center.name} Home`}
          >
            {center.logoUrl ? (
              <Image
                src={center.logoUrl}
                alt={center.name}
                width={36}
                height={36}
                className="h-9 w-9 object-contain rounded-[var(--radius-control)]"
                unoptimized
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold text-lg shadow-xs select-none">
                {center.shortName?.[0] || center.name?.[0] || 'C'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground leading-tight">
                {center.name}
              </span>
              {center.tagline ? (
                <span className="text-[10px] text-muted-foreground leading-tight font-medium hidden sm:inline">
                  {center.tagline}
                </span>
              ) : null}
            </div>
          </Link>

          {/* Desktop Nav Links (Hidden if publicSite is false and user is logged out) */}
          {showNavLinks && (
            <nav
              aria-label="Main Navigation"
              className="hidden lg:flex items-center gap-1 xl:gap-2"
            >
              {navLinks.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors duration-150',
                      'hover:bg-surface-hover hover:text-foreground',
                      active
                        ? 'text-primary bg-primary/10 font-bold'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Resources Menu for Logged-Out Users */}
              {!user && features.publicSite && (
                <DropdownMenu
                  align="left"
                  className="w-72 p-2"
                  trigger={
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors duration-150',
                        'hover:bg-surface-hover hover:text-foreground text-muted-foreground',
                        siteConfig.nav.resourcesMenu.some((r) => isLinkActive(r.href))
                          ? 'text-primary bg-primary/10 font-bold'
                          : ''
                      )}
                      aria-label="Resources menu"
                    >
                      <span>Resources</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150" aria-hidden="true" />
                    </button>
                  }
                  items={resourcesItems}
                />
              )}
            </nav>
          )}
        </div>

        {/* Right Section: ThemeToggle, Auth & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center">
            <ThemeToggle size="sm" variant="ghost" />
          </div>

          {/* Auth cluster */}
          <div className="flex items-center">
            <NavbarAuth />
          </div>

          {/* Mobile hamburger menu */}
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
