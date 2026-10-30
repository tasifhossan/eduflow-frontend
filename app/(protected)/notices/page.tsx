'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { formatDateTime } from '@/lib/format';
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  EmptyState,
  ErrorState,
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Megaphone,
  Plus,
  X,
  Trash2,
  Calendar,
  UserCheck,
  Building2,
  Users,
  Bell,
  Loader2,
} from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  branchId: string;
  batchId?: string | null;
  batch?: {
    id: string;
    name: string;
  } | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

interface BatchOption {
  id: string;
  name: string;
}

export default function NoticesPage() {
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch notices feed
      const res = await apiGet<{ success: boolean; data: Notice[] }>('/api/notices');
      if (res.success && res.data) {
        setNotices(res.data);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUserClient();
      if (user?.role) {
        setUserRole(user.role);
      }

      await fetchNotices();

      // If ADMIN or TEACHER, fetch batches for the post notice dropdown
      if (user?.role === 'ADMIN' || user?.role === 'TEACHER') {
        const batchRes = await apiGet<{ success: boolean; data: BatchOption[] }>('/api/batches')
          .catch(() => ({ success: false, data: [] }));
        if (batchRes.success && batchRes.data) {
          setBatches(batchRes.data);
        }
      }
    }

    loadData();
  }, []);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a notice title');
      return;
    }
    if (!content.trim()) {
      setFormError('Please enter notice content');
      return;
    }

    setPosting(true);
    setFormError(null);

    try {
      const res = await apiPost('/api/notices', {
        title: title.trim(),
        content: content.trim(),
        batchId: selectedBatchId || undefined,
      });

      if (res.success) {
        setTitle('');
        setContent('');
        setSelectedBatchId('');
        setIsFormOpen(false);

        // Refresh feed
        await fetchNotices();
      } else {
        setFormError(res.message || 'Failed to post notice');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred while posting notice');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    setDeletingId(id);
    try {
      const res = await apiDelete(`/api/notices/${id}`);
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      } else {
        alert(res.message || 'Failed to delete notice');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting notice');
    } finally {
      setDeletingId(null);
    }
  };

  const canPost = userRole === 'ADMIN' || userRole === 'TEACHER';
  const canDelete = userRole === 'ADMIN';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Notice Board"
        description="Official announcements, batch updates, and branch-wide notices"
        icon={<Megaphone className="h-5 w-5" />}
        actions={
          canPost ? (
            <Button
              variant={isFormOpen ? 'outline' : 'primary'}
              size="md"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="gap-2"
            >
              {isFormOpen ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Post Notice</span>
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {/* Error Banner */}
      {errorMsg && (
        <ErrorState
          title="Notice feed unavailable"
          message={errorMsg}
          onRetry={fetchNotices}
          retryLabel="Reload notices"
        />
      )}

      {/* Post Notice Form Modal/Card (Admin / Teacher) */}
      {canPost && isFormOpen && (
        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Create Announcement</span>
            </div>
          }
          description="Publish a new announcement for students and parents"
          actions={
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close form"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          }
        >
          {formError && (
            <div className="rounded-[var(--radius-control)] bg-status-danger-bg border border-status-danger-border p-3 mb-4 text-xs font-medium text-status-danger-text">
              {formError}
            </div>
          )}

          <form onSubmit={handlePostNotice} className="space-y-4">
            <FormField label="Notice Title" required>
              <Input
                type="text"
                required
                placeholder="e.g. Exam Schedule Update / Holiday Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>

            <FormField label="Target Audience" hint="Select a batch or send branch-wide">
              <Select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                <option value="">All Batches (Branch-Wide Notice)</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    Batch: {batch.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Notice Content" required>
              <Textarea
                rows={4}
                required
                placeholder="Write the full announcement details here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsFormOpen(false)}
                disabled={posting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={posting}
              >
                Publish Notice
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Loading Skeleton Feed */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2 pt-2 border-t border-border">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && notices.length === 0 && (
        <EmptyState
          icon={<Bell className="h-6 w-6 stroke-[1.5]" aria-hidden="true" />}
          title="No notices published yet"
          description="Check back later for official announcements, routine adjustments, and updates from your branch."
          action={
            canPost && !isFormOpen ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFormOpen(true)}
              >
                Create first announcement
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Notices Feed */}
      {!loading && notices.length > 0 && (
        <div className="space-y-4" role="feed" aria-label="Announcements feed">
          {notices.map((notice) => (
            <article
              key={notice.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 shadow-card hover:shadow-popover transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground tracking-tight">
                      {notice.title}
                    </h2>
                    {notice.batch ? (
                      <StatusBadge variant="upcoming" showDot>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          <span>{notice.batch.name}</span>
                        </span>
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="closed" showDot>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" aria-hidden="true" />
                          <span>Branch-wide</span>
                        </span>
                      </StatusBadge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{notice.createdBy.name} ({notice.createdBy.role.toLowerCase()})</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <time dateTime={notice.createdAt}>
                        {formatDateTime(notice.createdAt)}
                      </time>
                    </span>
                  </div>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNotice(notice.id)}
                    disabled={deletingId === notice.id}
                    className="p-2 rounded-[var(--radius-control)] text-status-danger-text hover:bg-status-danger-bg hover:text-status-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shrink-0"
                    title="Delete notice"
                    aria-label={`Delete notice: ${notice.title}`}
                  >
                    {deletingId === notice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed border-t border-border pt-3">
                {notice.content}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
