'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useCenter } from '@/components/providers/center-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsApiResponse {
  items: NotificationItem[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function NotificationsPage() {
  const { center } = useCenter();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);

  // Email update preference state (from /api/me)
  const [notifyByEmail, setNotifyByEmail] = React.useState<boolean>(false);
  const [isUpdatingEmailPref, setIsUpdatingEmailPref] = React.useState(false);

  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    apiGet<{ success: boolean; data?: { notifyByEmail?: boolean } }>('/api/me')
      .then((res) => {
        if (active && res?.success && res.data) {
          setNotifyByEmail(Boolean(res.data.notifyByEmail));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const query = new URLSearchParams({
          limit: '15',
          page: String(page),
          ...(unreadOnly ? { unreadOnly: 'true' } : {}),
        });
        const res = await apiGet<{ success: boolean; data: NotificationsApiResponse }>(
          `/api/notifications?${query.toString()}`
        );
        if (!active) return;
        if (res?.success && res.data) {
          setItems(res.data.items || []);
          setUnreadCount(res.data.unreadCount || 0);
          setTotalPages(res.data.pagination?.totalPages || 1);
          setError(null);
        } else {
          setError('Failed to load notifications');
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load notifications';
        setError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [page, unreadOnly, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await apiPost('/api/notifications/read-all');
      setItems((prev) =>
        prev.map((i) => ({ ...i, readAt: i.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all notifications as read');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (item: NotificationItem) => {
    if (item.readAt) return;
    try {
      await apiPatch(`/api/notifications/${item.id}/read`);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent error
    }
  };

  const handleToggleEmailPref = async (checked: boolean) => {
    setIsUpdatingEmailPref(true);
    setNotifyByEmail(checked);
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>('/api/me', {
        notifyByEmail: checked,
      });
      if (res?.success) {
        toast.success(
          checked
            ? 'Email notifications enabled'
            : 'Email notifications disabled'
        );
      } else {
        setNotifyByEmail(!checked);
        toast.error('Could not update email preferences');
      }
    } catch {
      setNotifyByEmail(!checked);
      toast.error('Failed to update email notification preference');
    } finally {
      setIsUpdatingEmailPref(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Notifications"
        description="Stay updated with published lectures, assignment releases, and grades"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Notifications' },
        ]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
            </Button>
          ) : undefined
        }
      />

      {/* Preferences Banner */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Email Notifications
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive updates via email when new assignments, grades, or schedule changes are published.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Switch
            checked={notifyByEmail}
            onChange={handleToggleEmailPref}
            disabled={isUpdatingEmailPref}
            aria-label="Toggle email notifications"
          />
          <span className="text-xs font-medium text-foreground">
            {notifyByEmail ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              !unreadOnly
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              unreadOnly
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-danger text-danger-foreground font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content State */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[var(--radius-card)] border border-border bg-surface space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load notifications"
          message={error}
          onRetry={handleRetry}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6 stroke-[1.5]" />}
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            unreadOnly
              ? 'You have caught up with all notifications.'
              : 'When lectures or assignments are updated, you will see alerts here.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-[var(--radius-card)] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isUnread
                    ? 'border-border bg-primary-subtle/20'
                    : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                      isUnread ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-sm ${
                          isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {isUnread && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[var(--radius-pill)] bg-primary-subtle text-primary border border-border">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.body}
                    </p>
                    <span className="text-[11px] text-muted-foreground mt-1.5 block">
                      {formatDateTime(item.createdAt, center?.timezone || 'Asia/Dhaka')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkSingleRead(item)}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Mark read</span>
                    </Button>
                  )}
                  {item.link && (
                    <Link
                      href={item.link}
                      onClick={() => handleMarkSingleRead(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-control)] bg-surface border border-border text-foreground hover:bg-surface-hover text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="pt-4 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
}
