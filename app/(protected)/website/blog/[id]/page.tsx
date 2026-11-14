'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Save,
  Send,
  EyeOff,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ImageUpload } from '@/components/ui/image-upload';
import { MarkdownEditor } from '@/components/content/markdown-editor';
import { CmsStatusBadge, CmsContentStatus } from '@/components/content/status-badges';
import { LastUpdatedLine } from '@/components/content/last-updated-line';
import { Modal } from '@/components/ui/modal';
import { Tooltip } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { utcToCenterDateTimeInput, centerDateTimeInputToUtc } from '@/lib/tz';

interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  status: CmsContentStatus;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
}

export default function BlogEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { center } = useCenter();

  const id = typeof params.id === 'string' ? params.id : '';
  const isNew = id === 'new';
  const isOwner = user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = React.useState(!isNew);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Form Fields
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [excerpt, setExcerpt] = React.useState('');
  const [content, setContent] = React.useState('');
  const [coverImage, setCoverImage] = React.useState<string | null>(null);

  // Existing metadata
  const [postRecord, setPostRecord] = React.useState<BlogPostRecord | null>(null);
  const [existingCategories, setExistingCategories] = React.useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Modals
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);
  const [publishMode, setPublishMode] = React.useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = React.useState('');
  const [isPublishing, setIsPublishing] = React.useState(false);

  const [unpublishModalOpen, setUnpublishModalOpen] = React.useState(false);
  const [isUnpublishing, setIsUnpublishing] = React.useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Initial load
  const loadPost = React.useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: BlogPostRecord }>(`/api/cms/blog/${id}`);
      if (res.success && res.data) {
        const p = res.data;
        setPostRecord(p);
        setTitle(p.title || '');
        setSlug(p.slug || '');
        setCategory(p.category || '');
        setExcerpt(p.excerpt || '');
        setContent(p.content || '');
        setCoverImage(p.coverImage || null);
        setHasUnsavedChanges(false);
      } else {
        setError('Failed to load article.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading article.');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  // Load existing categories for combobox
  React.useEffect(() => {
    let mounted = true;
    apiGet<{ success: boolean; data: { posts: Array<{ category?: string | null }> } }>('/api/cms/blog?limit=50')
      .then((res) => {
        if (mounted && res.success && res.data?.posts) {
          const cats = Array.from(
            new Set(res.data.posts.map((p) => p.category?.trim()).filter((c): c is string => Boolean(c)))
          );
          setExistingCategories(cats);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (isNew) return;
    let mounted = true;
    apiGet<{ success: boolean; data: BlogPostRecord }>(`/api/cms/blog/${id}`)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          const p = res.data;
          setPostRecord(p);
          setTitle(p.title || '');
          setSlug(p.slug || '');
          setCategory(p.category || '');
          setExcerpt(p.excerpt || '');
          setContent(p.content || '');
          setCoverImage(p.coverImage || null);
          setHasUnsavedChanges(false);
        } else {
          setError('Failed to load article.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error loading article.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  // Slug is locked if publishedAt was ever recorded
  const isSlugLocked = Boolean(postRecord?.publishedAt);

  // Unsaved changes browser prompt
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle Title change -> auto slug if not locked
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setHasUnsavedChanges(true);
    if (!isSlugLocked && (isNew || !postRecord?.publishedAt)) {
      // Auto-generate kebab slug
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generated);
    }
  };

  // Save Draft (POST or PATCH)
  const handleSaveDraft = async () => {
    setSaving(true);
    setFieldErrors({});

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category: category.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        content: content.trim() || undefined,
        coverImage: coverImage || undefined,
      };

      if (!isSlugLocked && slug.trim()) {
        payload.slug = slug.trim().toLowerCase();
      }

      if (isNew) {
        const res = await apiPost<{ success: boolean; data: BlogPostRecord }>('/api/cms/blog', payload);
        if (res.success && res.data) {
          toast.success('Draft article created successfully.');
          setHasUnsavedChanges(false);
          router.replace(`/website/blog/${res.data.id}`);
        } else {
          toast.error('Failed to create article.');
        }
      } else {
        const res = await apiPatch<{ success: boolean; data: BlogPostRecord }>(`/api/cms/blog/${id}`, payload);
        if (res.success && res.data) {
          toast.success('Article draft saved.');
          setPostRecord(res.data);
          setHasUnsavedChanges(false);
        } else {
          toast.error('Failed to save article.');
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: Array<{ field: string; message: string }> };
      if (errorObj?.details && Array.isArray(errorObj.details)) {
        const errorsMap: Record<string, string> = {};
        for (const item of errorObj.details) {
          errorsMap[item.field] = item.message;
        }
        setFieldErrors(errorsMap);
      }
      toast.error(errorObj?.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  // Open Publish Modal
  const openPublishModal = () => {
    // Validate required fields client-side first
    const missing: string[] = [];
    if (!title.trim()) missing.push('Title');
    if (!excerpt.trim()) missing.push('Excerpt');
    if (!content.trim()) missing.push('Content');
    if (!category.trim()) missing.push('Category');

    if (missing.length > 0) {
      toast.error(`Publishing requires: ${missing.join(', ')}.`);
      return;
    }

    // Default scheduled time to 1 hour from now in center timezone
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setScheduledDateTime(utcToCenterDateTimeInput(now, center.timezone));
    setPublishMode('now');
    setPublishModalOpen(true);
  };

  // Execute Publish
  const handlePublishSubmit = async () => {
    if (!isOwner) {
      toast.error('Only the center owner (SUPER_ADMIN) can publish articles.');
      return;
    }

    setIsPublishing(true);
    try {
      // First ensure current edits are saved
      if (hasUnsavedChanges && !isNew) {
        await apiPatch(`/api/cms/blog/${id}`, {
          title: title.trim(),
          category: category.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          content: content.trim() || undefined,
          coverImage: coverImage || undefined,
        });
      }

      let publishedAtIso: string | undefined = undefined;
      if (publishMode === 'schedule') {
        if (!scheduledDateTime) {
          toast.error('Please pick a schedule date and time.');
          setIsPublishing(false);
          return;
        }
        publishedAtIso = centerDateTimeInputToUtc(scheduledDateTime, center.timezone);
      }

      const res = await apiPost<{ success: boolean; data: BlogPostRecord }>(
        `/api/cms/blog/${id}/publish`,
        publishedAtIso ? { publishedAt: publishedAtIso } : {}
      );

      if (res.success && res.data) {
        setPostRecord(res.data);
        setHasUnsavedChanges(false);
        setPublishModalOpen(false);
        toast.success(
          publishMode === 'schedule'
            ? 'Article scheduled successfully.'
            : 'Article published live.'
        );
      } else {
        toast.error('Failed to publish article.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Publishing failed.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish
  const handleUnpublish = async () => {
    if (!isOwner) {
      toast.error('Only the center owner can unpublish articles.');
      return;
    }

    setIsUnpublishing(true);
    try {
      const res = await apiPost<{ success: boolean; data: BlogPostRecord }>(`/api/cms/blog/${id}/unpublish`, {});
      if (res.success && res.data) {
        setPostRecord(res.data);
        setUnpublishModalOpen(false);
        toast.success('Article unpublished and reverted to draft.');
      } else {
        toast.error('Failed to unpublish article.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Unpublish failed.');
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!isOwner) {
      toast.error('Only the center owner can delete articles.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await apiDelete<{ success: boolean }>(`/api/cms/blog/${id}`);
      if (res.success) {
        toast.success('Article deleted permanently.');
        setDeleteModalOpen(false);
        router.replace('/website/blog');
      } else {
        toast.error('Failed to delete article.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <Link href="/website/blog">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Articles
            </Link>
          </Button>

          {postRecord && (
            <div className="flex items-center gap-3">
              <CmsStatusBadge
                status={postRecord.status}
                scheduledAt={postRecord.publishedAt}
              />
              <LastUpdatedLine
                updatedAt={postRecord.updatedAt}
                updatedByName={postRecord.updatedBy?.name}
              />
            </div>
          )}
        </div>

        <PageHeader
          title={isNew ? 'New Blog Article' : 'Edit Blog Article'}
          description="Draft, schedule, and publish educational posts. Publishing requires title, category, excerpt, and content."
          icon={<FileText className="h-6 w-6 text-primary" aria-hidden="true" />}
        />

        {error ? (
          <ErrorState
            title="Failed to load article"
            message={error}
            onRetry={loadPost}
          />
        ) : loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6 bg-surface p-6 rounded-[var(--radius-card)] border border-border">
            {/* Title */}
            <FormField
              label="Article Title"
              required
              error={fieldErrors.title}
              hint="Maximum 120 characters"
            >
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={120}
                placeholder="e.g. Effective Revision Strategies for HSC Board Exams"
              />
            </FormField>

            {/* Slug & Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="URL Slug"
                required
                error={fieldErrors.slug}
                hint={
                  isSlugLocked
                    ? 'Slug is permanently locked because this article has been published.'
                    : 'Auto-generated from title. Editable before first publication.'
                }
              >
                <div className="relative">
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={isSlugLocked}
                    placeholder="e.g. effective-revision-strategies"
                    className={isSlugLocked ? 'pr-9 bg-muted text-muted-foreground' : ''}
                  />
                  {isSlugLocked && (
                    <Lock
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </FormField>

              {/* Category Combobox */}
              <FormField
                label="Category"
                required
                error={fieldErrors.category}
                hint="Max 40 chars. Select existing or type new."
              >
                <div className="space-y-1.5">
                  <Input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    list="blog-categories"
                    maxLength={40}
                    placeholder="e.g. Exam Preparation"
                  />
                  <datalist id="blog-categories">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </FormField>
            </div>

            {/* Excerpt with 200 char counter */}
            <FormField
              label="Excerpt"
              required
              error={fieldErrors.excerpt}
              hint={`Short overview for cards and meta descriptions (${excerpt.length}/200)`}
            >
              <div className="space-y-1">
                <textarea
                  value={excerpt}
                  onChange={(e) => {
                    setExcerpt(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  maxLength={200}
                  rows={3}
                  placeholder="A concise summary of the article..."
                  className="w-full p-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
                />
              </div>
            </FormField>

            {/* Cover Image Upload */}
            <FormField
              label="Cover Image"
              error={fieldErrors.coverImage}
              hint="Recommended 16:9 aspect ratio. Max 2 MB (PNG, JPG, WebP)."
            >
              <ImageUpload
                value={coverImage}
                onChange={(url) => {
                  setCoverImage(url);
                  setHasUnsavedChanges(true);
                }}
                aspectRatio="video"
              />
            </FormField>

            {/* Markdown Content Editor */}
            <MarkdownEditor
              label="Article Content"
              value={content}
              onChange={(val) => {
                setContent(val);
                setHasUnsavedChanges(true);
              }}
              error={fieldErrors.content}
              maxChars={20000}
            />

            {/* Action Buttons Bar */}
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  onClick={handleSaveDraft}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save Draft
                </Button>

                {!isNew && (
                  <>
                    {/* Publish Trigger (SUPER_ADMIN only) */}
                    {isOwner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={openPublishModal}
                        className="gap-1.5"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {postRecord?.isPublished ? 'Publish Updates' : 'Publish / Schedule'}
                      </Button>
                    ) : (
                      <Tooltip content="Only the owner can do this">
                        <div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            disabled
                            className="gap-1.5"
                          >
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Publish
                          </Button>
                        </div>
                      </Tooltip>
                    )}

                    {/* Unpublish Trigger */}
                    {postRecord?.isPublished && (
                      isOwner ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          onClick={() => setUnpublishModalOpen(true)}
                          className="gap-1.5"
                        >
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                          Unpublish
                        </Button>
                      ) : (
                        <Tooltip content="Only the owner can do this">
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              disabled
                              className="gap-1.5"
                            >
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                              Unpublish
                            </Button>
                          </div>
                        </Tooltip>
                      )
                    )}
                  </>
                )}
              </div>

              {/* Delete Trigger */}
              {!isNew && (
                <div>
                  {isOwner ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteModalOpen(true)}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete Article
                    </Button>
                  ) : (
                    <Tooltip content="Only the owner can do this">
                      <div>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled
                          className="gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete Article
                        </Button>
                      </div>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Publish / Schedule Modal */}
        <Modal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          title="Publish Article"
          description="Choose whether to publish immediately or schedule for a future date and time."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPublishModalOpen(false)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isPublishing}
                onClick={handlePublishSubmit}
              >
                {publishMode === 'schedule' ? 'Schedule Publication' : 'Publish Live Now'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPublishMode('now')}
                className={`p-3 rounded-[var(--radius-control)] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  publishMode === 'now'
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Publish Now</span>
                </div>
                <p className="text-[11px] font-normal mt-1 text-muted-foreground">
                  Immediately visible to visitors on the website.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode('schedule')}
                className={`p-3 rounded-[var(--radius-control)] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  publishMode === 'schedule'
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Schedule</span>
                </div>
                <p className="text-[11px] font-normal mt-1 text-muted-foreground">
                  Automatically appears once scheduled time is reached.
                </p>
              </button>
            </div>

            {publishMode === 'schedule' && (
              <div className="space-y-2 p-3 rounded-[var(--radius-control)] bg-surface-hover/40 border border-border">
                <label className="block text-xs font-semibold text-foreground">
                  Schedule Date & Time ({center.timezone})
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="bg-surface"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Times are evaluated in the center timezone: <strong>{center.timezone}</strong>
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Unpublish Confirmation Modal */}
        <Modal
          isOpen={unpublishModalOpen}
          onClose={() => setUnpublishModalOpen(false)}
          title="Unpublish Article?"
          description="The article will be removed from the public website and reverted to draft status. Its URL slug will remain locked."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnpublishModalOpen(false)}
                disabled={isUnpublishing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="accent"
                isLoading={isUnpublishing}
                onClick={handleUnpublish}
              >
                Confirm Unpublish
              </Button>
            </div>
          }
        >
          <div className="p-2 text-sm text-muted-foreground">
            Are you sure you want to take this post offline? Visitors will get a 404 until you publish it again.
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Article Permanently?"
          description="This action cannot be undone. The article and its contents will be permanently deleted."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                onClick={handleDelete}
              >
                Delete Permanently
              </Button>
            </div>
          }
        >
          <div className="p-2 text-sm text-danger flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Are you sure you want to delete &ldquo;{title}&rdquo;?</span>
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
