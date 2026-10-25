'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  User,
  HelpCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function NavbarAuth() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Zero layout shift skeleton while auth state resolves
  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5" aria-hidden="true">
        <Skeleton className="h-9 w-16 rounded-[var(--radius-control)]" />
        <Skeleton className="h-9 w-24 rounded-[var(--radius-control)]" />
      </div>
    );
  }

  // Logged-in state
  if (user) {
    const firstName = user.name ? user.name.split(' ')[0] : 'User';

    const menuItems: DropdownMenuItem[] = [
      {
        id: 'user-header',
        custom: (
          <div className="flex flex-col gap-1 pb-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground text-xs truncate max-w-[140px]">{user.name}</span>
              <Badge variant="secondary" size="sm" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                {user.role}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
          </div>
        ),
      },
      { divider: true },
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        onClick: () => router.push('/dashboard'),
      },
      {
        id: 'profile',
        label: 'My profile',
        icon: <User className="h-4 w-4" />,
        onClick: () => router.push('/dashboard'),
      },
      {
        id: 'faq',
        label: 'Help & FAQ',
        icon: <HelpCircle className="h-4 w-4" />,
        onClick: () => router.push('/faq'),
      },
      { divider: true },
      {
        id: 'theme-row',
        custom: (
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-medium text-foreground">Theme</span>
            <ThemeToggle size="sm" variant="ghost" />
          </div>
        ),
      },
      { divider: true },
      {
        id: 'logout',
        label: isLoggingOut ? 'Logging out...' : 'Log out',
        icon: <LogOut className="h-4 w-4" />,
        danger: true,
        disabled: isLoggingOut,
        onClick: handleLogout,
      },
    ];

    return (
      <div className="flex items-center gap-3">
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-2 h-10 rounded-[var(--radius-control)] hover:bg-surface-hover"
              aria-label={`User menu for ${user.name}`}
            >
              <Avatar
                src={user.avatarUrl}
                name={user.name}
                size="sm"
                className="h-7 w-7 text-[11px]"
              />
              <span className="text-xs font-semibold text-foreground max-w-[100px] truncate hidden sm:inline">
                {firstName}
              </span>
              <Badge variant="secondary" size="sm" className="hidden lg:inline-flex text-[10px] px-1.5 py-0">
                {user.role}
              </Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </Button>
          }
          items={menuItems}
        />
      </div>
    );
  }

  // Logged-out state
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password';

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {isAuthPage ? (
        <Button asChild variant="outline" size="sm" className="font-semibold text-xs h-9 px-3 sm:px-4">
          <Link href="/">Back to Home</Link>
        </Button>
      ) : (
        <Button asChild variant="primary" size="sm" className="font-semibold text-xs h-9 px-3 sm:px-4 shadow-sm">
          <Link href="/login">Log in</Link>
        </Button>
      )}
    </div>
  );
}
