'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  Layers,
  BookOpen,
  FileText,
  GraduationCap,
  Users,
  ShieldCheck,
  HeartHandshake,
  UserCog,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  Building2,
  ShieldAlert,
  Settings,
  Video,
  ClipboardCheck,
  X,
} from 'lucide-react';
import type { CenterPublicData, CenterFeatures } from '@/lib/types/center';

export interface NavItem {
  name: string;
  href: string;
  roles: string[];
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  featureFlag?: keyof CenterFeatures;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN', 'SUPER_ADMIN'],
        icon: LayoutDashboard,
      },
      {
        name: 'Notices',
        href: '/notices',
        roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN'],
        icon: Bell,
      },
    ],
  },
  {
    label: 'Academics',
    items: [
      {
        name: 'Lectures',
        href: '/lectures',
        roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN', 'SUPER_ADMIN'],
        icon: Video,
        featureFlag: 'lectures',
      },
      {
        name: 'Assignments',
        href: '/assignments',
        roles: ['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN', 'SUPER_ADMIN'],
        icon: ClipboardCheck,
        featureFlag: 'assignments',
      },
      {
        name: 'Batches',
        href: '/batches',
        roles: ['ADMIN', 'TEACHER'],
        icon: Layers,
      },
      {
        name: 'My Batches',
        href: '/my-batches',
        roles: ['STUDENT'],
        icon: BookOpen,
      },
      {
        name: 'Tests',
        href: '/tests',
        roles: ['ADMIN', 'TEACHER', 'STUDENT'],
        icon: FileText,
      },
      {
        name: 'Subjects',
        href: '/subjects',
        roles: ['ADMIN'],
        icon: GraduationCap,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        name: 'Students',
        href: '/students',
        roles: ['ADMIN', 'TEACHER'],
        icon: Users,
      },
      {
        name: 'Guardians',
        href: '/guardians',
        roles: ['ADMIN'],
        icon: ShieldCheck,
      },
      {
        name: 'My Children',
        href: '/my-children',
        roles: ['GUARDIAN'],
        icon: HeartHandshake,
      },
      {
        name: 'Users',
        href: '/users',
        roles: ['ADMIN', 'SUPER_ADMIN'],
        icon: UserCog,
      },
    ],
  },
  {
    label: 'Operations & Finance',
    items: [
      {
        name: 'Attendance',
        href: '/attendance',
        roles: ['ADMIN', 'TEACHER', 'STUDENT'],
        icon: CalendarCheck,
      },
      {
        name: 'My Payments',
        href: '/payments',
        roles: ['STUDENT'],
        icon: CreditCard,
      },
      {
        name: 'Audit Logs',
        href: '/audit-logs',
        roles: ['ADMIN', 'SUPER_ADMIN'],
        icon: ClipboardList,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        name: 'Branches',
        href: '/branches',
        roles: ['SUPER_ADMIN'],
        icon: Building2,
      },
      {
        name: 'Super Admin',
        href: '/super-admin',
        roles: ['SUPER_ADMIN'],
        icon: ShieldAlert,
      },
      {
        name: 'Settings',
        href: '/settings',
        roles: ['SUPER_ADMIN'],
        icon: Settings,
      },
    ],
  },
];

export interface DashboardSidebarProps {
  center: CenterPublicData;
  userRole: string;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function DashboardSidebar({
  center,
  userRole,
  isMobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close drawer on pathname route change
  React.useEffect(() => {
    if (isMobileOpen) {
      onMobileClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Escape key and focus trap when mobile drawer is open
  React.useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onMobileClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the close button or first interactive element upon opening
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isMobileOpen, onMobileClose]);

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const navContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-fg">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <Link
          href="/dashboard"
          title={center.name}
          className="flex items-center gap-3 min-w-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-bar rounded-lg p-1"
        >
          {center.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={center.logoUrl}
              alt={center.name}
              className="h-8 w-8 object-contain rounded-[var(--radius-control)] bg-surface shrink-0 border border-sidebar-border"
            />
          ) : (
            <span
              className="h-8 w-8 rounded-[var(--radius-control)] bg-sidebar-active-bg text-sidebar-active-fg border border-sidebar-border flex items-center justify-center font-heading font-bold text-sm shrink-0"
              aria-hidden="true"
            >
              {(center.shortName?.[0] || center.name?.[0] || 'E').toUpperCase()}
            </span>
          )}
          <span className="font-heading font-bold text-base tracking-tight text-sidebar-fg truncate group-hover:text-sidebar-active-fg transition-colors">
            {center.name}
          </span>
        </Link>

        {/* Mobile close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
          className="lg:hidden h-11 w-11 flex items-center justify-center rounded-[var(--radius-control)] text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-bar transition-colors shrink-0"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation Groups with soft bottom fade */}
      <nav
        aria-label="Sidebar Navigation"
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-6"
        style={{
          maskImage: 'linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)',
        }}
      >
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (!item.roles.includes(userRole)) return false;
            if (item.featureFlag && center.features?.[item.featureFlag] === false) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              <span className="block px-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider select-none">
                {group.label}
              </span>
              <ul className="space-y-0.5" role="list">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-control)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-bar min-h-[44px] ${
                          isActive
                            ? 'bg-sidebar-active-bg text-sidebar-active-fg font-semibold'
                            : 'text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover'
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-sidebar-active-bar"
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-sidebar-active-bar'
                              : 'text-sidebar-muted group-hover:text-sidebar-fg'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Pinned Footer */}
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-muted shrink-0 flex flex-col gap-1">
        <span className="truncate font-medium text-sidebar-fg" title={center.name}>
          {center.name}
        </span>
        {center.features?.showPoweredBy !== false && (
          <span className="text-[11px] text-sidebar-muted">
            Powered by EduFlow
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-[280px] flex-col shrink-0 border-r border-sidebar-border h-screen sticky top-0 z-20">
        {navContent}
      </aside>

      {/* Tablet & Mobile Off-Canvas Drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop overlay */}
          <div
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer sheet */}
          <div
            ref={drawerRef}
            className="relative w-[280px] max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
