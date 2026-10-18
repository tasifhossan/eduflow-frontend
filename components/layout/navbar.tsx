'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';
import { useAuth } from '@/components/providers/auth-provider';
import { Container } from '@/components/ui/container';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { NavbarAuth } from './navbar-auth';
import { MobileMenu } from './mobile-menu';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinks = user ? siteConfig.nav.loggedIn : siteConfig.nav.loggedOut;

  // Resources dropdown items for logged-out navigation
  const resourcesItems: DropdownMenuItem[] = siteConfig.nav.resourcesMenu.map((item) => {
    const IconComponent = item.iconName ? ICON_MAP[item.iconName] || HelpCircle : HelpCircle;
    return {
      id: item.href + item.label,
      label: item.label,
      description: item.description,
      icon: <IconComponent className="h-4 w-4" />,
      onClick: () => router.push(item.href),
    };
  });

  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] w-full transition-[background-color,border-color,box-shadow] duration-200',
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
            aria-label={`${siteConfig.brand.name} Home`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold text-lg shadow-xs select-none">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground leading-tight">
                {siteConfig.brand.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight font-medium hidden sm:inline">
                Coaching Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
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
            {!user && (
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
        </div>

        {/* Right Section: ThemeToggle, Auth & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center">
            <ThemeToggle size="sm" variant="ghost" />
          </div>

          {/* Auth cluster (zero layout shift with skeleton) */}
          <div className="hidden sm:flex items-center">
            <NavbarAuth />
          </div>

          {/* Mobile hamburger menu */}
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
