'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function NotificationBell() {
  const router = useRouter();
  const { center } = useCenter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const fetchLatest = React.useCallback(async (showLoading = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (showLoading) setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: NotificationsResponse }>(
        '/api/notifications?limit=10&page=1'
      );
      if (res?.success && res.data) {
        setItems(res.data.items || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Background poll failure is silent
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial load + Polling every 60s and on visibility / focus
  React.useEffect(() => {
    // Invoke asynchronously
    const timer = setTimeout(() => {
      fetchLatest();
    }, 0);

    const interval = setInterval(() => {
      fetchLatest();
    }, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLatest();
      }
    };

    const handleFocus = () => {
      fetchLatest();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchLatest]);

  // Click outside to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchLatest(items.length === 0);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await apiPost('/api/notifications/read-all');
      setItems((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await apiPatch(`/api/notifications/${item.id}/read`);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue navigation even if read patch fails
      }
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative flex items-center justify-center h-11 w-11 rounded-[var(--radius-control)] border border-transparent hover:border-border hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-danger text-danger-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="region"
          aria-label="Recent notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-card)] bg-surface border border-border shadow-popover z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/30">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] bg-primary-subtle text-primary border border-border">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isMarkingAll ? 'Marking...' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* Content List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-border">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                <Spinner size="md" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] mt-0.5">We will notify you when assignments or lectures are published.</p>
              </div>
            ) : (
              items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3.5 hover:bg-surface-hover transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:bg-surface-hover ${
                      isUnread ? 'bg-primary-subtle/20' : ''
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                        isUnread ? 'bg-primary' : 'bg-transparent'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'} truncate`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {item.body}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                        <span>{formatDateTime(item.createdAt, center?.timezone || 'Asia/Dhaka')}</span>
                        {item.link && (
                          <span className="flex items-center gap-0.5 text-primary hover:underline">
                            <span>Open</span>
                            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-surface-hover/30 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="w-full text-xs text-primary hover:bg-primary-subtle/50"
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
