'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/cn';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
}

const emptySubscribe = () => () => {};

export function ThemeToggle({
  className,
  variant = 'outline',
  size = 'icon',
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn('relative transition-colors duration-200', className)}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-accent transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="h-5 w-5 text-foreground transition-transform duration-200 rotate-0 scale-100" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
