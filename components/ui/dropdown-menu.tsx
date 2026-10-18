'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface DropdownMenuItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-expanded'?: boolean;
    className?: string;
  }>;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  // Filter out dividers for keyboard focus navigation
  const actionItems = React.useMemo(
    () => items.filter((item) => !item.divider && !item.disabled),
    [items]
  );

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(!isOpen);
    setFocusedIndex(-1);
  };

  const close = () => {
    setIsOpen(false);
    setFocusedIndex(-1);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  // Click outside listener
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < actionItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : actionItems.length - 1));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, actionItems]);

  // Clone trigger element so we don't nest <button> inside <button>
  const clonedTrigger = React.isValidElement(trigger) ? (
    React.cloneElement(trigger, {
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      onClick: (e: React.MouseEvent) => {
        trigger.props.onClick?.(e);
        toggle(e);
      },
    })
  ) : (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={toggle}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[var(--radius-control)]"
    >
      {trigger}
    </button>
  );

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {clonedTrigger}

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute z-[var(--z-dropdown)] mt-2 w-56 rounded-[var(--radius-control)] border border-border bg-surface p-1.5 shadow-popover text-foreground',
            'animate-in fade-in zoom-in-95 duration-150 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1.5 h-px bg-border" role="separator" />;
            }

            const actionIdx = actionItems.findIndex((a) => a === item);
            const isHighlighted = actionIdx === focusedIndex;

            return (
              <button
                key={item.id || idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  close();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-xs font-medium transition-colors text-left',
                  'hover:bg-surface-hover focus-visible:outline-none',
                  isHighlighted && 'bg-surface-hover',
                  item.danger
                    ? 'text-danger hover:bg-danger/10 hover:text-danger'
                    : 'text-foreground',
                  item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                )}
              >
                {item.icon && <span className="h-4 w-4 shrink-0 text-muted-foreground">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
