'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, KeyRound, LogOut, ChevronDown, Building, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import { clearExamBackups } from '@/lib/client-auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from './notification-bell';

export interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    branchId?: string;
  };
  branchName?: string | null;
  onOpenMobileNav: () => void;
}

export function DashboardHeader({
  user,
  branchName,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      clearExamBackups();
      await apiPost('/api/auth/logout');
      toast.success('Signed out successfully');
    } catch (err) {
      clearExamBackups();
      console.warn('Backend logout warning:', err);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || user.name.charAt(0).toUpperCase() || 'U';

  const userMenuItems: DropdownMenuItem[] = [
    // 1. Header Card: User details
    {
      custom: (
        <div className="px-3.5 py-3 border-b border-border bg-surface-hover/40 -mx-1 -mt-1 rounded-t-[calc(var(--radius-control)-2px)]">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full bg-primary-subtle text-primary border border-border flex items-center justify-center font-bold text-sm shrink-0"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <Badge variant="primary" size="sm" className="capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </Badge>
              </div>
              {branchName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                  <Building className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{branchName}</span>
                </div>
              )}
              {(user.email || user.phone) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {user.email || user.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      ),
    },
    // 2. Change password
    {
      id: 'change-password',
      label: 'Change password',
      icon: <KeyRound className="h-4 w-4" aria-hidden="true" />,
      onClick: () => router.push('/change-password'),
    },
    // 3. Theme toggle row
    {
      custom: (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-foreground font-medium">
          <span className="flex items-center gap-2">
            {isClient && theme === 'dark' ? (
              <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            <span>Dark mode</span>
          </span>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-xs text-primary hover:underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
          >
            {isClient && theme === 'dark' ? 'Disable' : 'Enable'}
          </button>
        </div>
      ),
    },
    { divider: true },
    // 4. Log out
    {
      id: 'logout',
      label: isLoggingOut ? 'Signing out...' : 'Sign out',
      icon: <LogOut className="h-4 w-4" aria-hidden="true" />,
      danger: true,
      onClick: handleLogout,
      disabled: isLoggingOut,
    },
  ];

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 sticky top-0">
      {/* Left: Mobile hamburger + section title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden h-11 w-11 flex items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="hidden sm:block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Portal
          </span>
          {branchName && (
            <span className="text-xs text-muted-foreground ml-2">
              · {branchName}
            </span>
          )}
        </div>
      </div>

      {/* Right: Notification bell + Theme toggle + User menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />

        <ThemeToggle />

        <div className="h-6 w-px bg-border hidden sm:block" aria-hidden="true" />

        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              aria-label={`User menu for ${user.name}`}
              className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-[var(--radius-control)] hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border transition-colors min-h-[44px]"
            >
              <div
                className="h-8 w-8 rounded-full bg-primary-subtle text-primary border border-border flex items-center justify-center font-bold text-xs shrink-0"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[11px] text-muted-foreground capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}
