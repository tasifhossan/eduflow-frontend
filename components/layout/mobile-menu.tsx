'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/site-config';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HelpCircle,
  BookOpen,
  ShieldCheck,
  FileText,
};

export function MobileMenu() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close when pathname changes
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Lock body scroll and handle Escape key + focus trap
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Simple focus trap
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setIsOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLinks = user ? siteConfig.nav.loggedIn : siteConfig.nav.loggedOut;

  return (
    <div className="lg:hidden">
      {/* Hamburger Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open mobile navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        className="min-h-[44px] min-w-[44px] p-2.5 text-foreground hover:bg-surface-hover"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          id="mobile-nav-drawer"
          className="fixed inset-0 z-[var(--z-modal)] flex justify-end"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            className="relative z-10 flex h-full w-full max-w-sm flex-col bg-surface border-l border-border shadow-xl animate-in slide-in-from-right duration-250 ease-out overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 min-h-[64px]">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[var(--radius-control)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                  E
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-foreground leading-tight">
                    {siteConfig.brand.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight font-medium">
                    Coaching Platform
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                <ThemeToggle size="sm" variant="ghost" />
                <Button
                  ref={closeButtonRef}
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close mobile navigation menu"
                  className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* User Profile Summary (if logged in) */}
            {user && (
              <div className="border-b border-border bg-surface-hover/40 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="md"
                    className="h-10 w-10 text-xs"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {user.name}
                      </span>
                      <Badge variant="secondary" size="sm" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                        {user.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nav Links */}
            <div className="flex-1 px-4 py-4 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                Menu
              </div>

              {navLinks.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center min-h-[44px] px-3.5 py-2.5 rounded-[var(--radius-control)] text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-surface-hover'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Resources Collapsible/Expanded Section */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setIsResourcesOpen((prev) => !prev)}
                  className="flex items-center justify-between w-full min-h-[44px] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  aria-expanded={isResourcesOpen}
                >
                  <span>Resources</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isResourcesOpen ? 'rotate-180' : ''
                    )}
                    aria-hidden="true"
                  />
                </button>

                {isResourcesOpen && (
                  <div className="mt-1 space-y-1 pl-2 border-l-2 border-border/60 ml-3">
                    {siteConfig.nav.resourcesMenu.map((item) => {
                      const Icon = item.iconName ? ICON_MAP[item.iconName] || HelpCircle : HelpCircle;
                      const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          aria-current={isItemActive ? 'page' : undefined}
                          className={cn(
                            'flex items-start gap-2.5 min-h-[44px] px-3 py-2 rounded-[var(--radius-control)] text-xs transition-colors',
                            isItemActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-foreground hover:bg-surface-hover'
                          )}
                        >
                          <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.label}</span>
                            {item.description && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions / Auth */}
            <div className="border-t border-border p-4 bg-surface space-y-2">
              {user ? (
                <div className="space-y-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full min-h-[44px] justify-center font-semibold text-xs"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full min-h-[44px] justify-center text-xs font-semibold text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </Button>
                </div>
              ) : (
                <div>
                  <Button asChild variant="primary" className="w-full min-h-[44px] text-xs font-semibold">
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
