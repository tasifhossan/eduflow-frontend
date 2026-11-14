'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  MessageSquareQuote,
  Plus,
  Star,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Send,
  EyeOff,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Tooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ImageUpload } from '@/components/ui/image-upload';
import { CmsStatusBadge } from '@/components/content/status-badges';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api';

interface TestimonialRecord {
  id: string;
  name: string;
  roleTitle?: string | null;
  content: string;
  rating: number;
  avatarUrl?: string | null;
  hasConsent: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { id: string; name: string } | null;
}

export default function WebsiteTestimonialsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'SUPER_ADMIN';

  const [testimonials, setTestimonials] = React.useState<TestimonialRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Edit / Add modal
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<TestimonialRecord | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formRoleTitle, setFormRoleTitle] = React.useState('');
  const [formContent, setFormContent] = React.useState('');
  const [formRating, setFormRating] = React.useState(5);
  const [formAvatarUrl, setFormAvatarUrl] = React.useState<string | null>(null);
  const [formHasConsent, setFormHasConsent] = React.useState(false);
  const [savingItem, setSavingItem] = React.useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingItem, setDeletingItem] = React.useState<TestimonialRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadTestimonials = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: { testimonials: TestimonialRecord[] } }>(
        '/api/cms/testimonials?limit=100'
      );
      if (res.success && res.data?.testimonials) {
        setTestimonials(res.data.testimonials);
      } else {
        setError('Failed to load testimonials.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading testimonials.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiGet<{ success: boolean; data: { testimonials: TestimonialRecord[] } }>(
      '/api/cms/testimonials?limit=100'
    )
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data?.testimonials) {
          setTestimonials(res.data.testimonials);
        } else {
          setError('Failed to load testimonials.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error loading testimonials.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Reorder items
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;

    const nextItems = [...testimonials];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;

    setTestimonials(nextItems);

    try {
      const ids = nextItems.map((i) => i.id);
      await apiPut('/api/cms/testimonials/order', { ids });
    } catch {
      toast.error('Failed to save testimonial order.');
      loadTestimonials();
    }
  };

  // Featured toggle
  const handleToggleFeatured = async (item: TestimonialRecord) => {
    try {
      const res = await apiPatch<{ success: boolean; data: TestimonialRecord }>(
        `/api/cms/testimonials/${item.id}/featured`,
        { isFeatured: !item.isFeatured }
      );
      if (res.success) {
        toast.success(item.isFeatured ? 'Removed from featured.' : 'Marked as featured.');
        loadTestimonials();
      }
    } catch {
      toast.error('Failed to update featured state.');
    }
  };

  // Open Add
  const handleOpenNew = () => {
    setEditingItem(null);
    setFormName('');
    setFormRoleTitle('');
    setFormContent('');
    setFormRating(5);
    setFormAvatarUrl(null);
    setFormHasConsent(false);
    setEditModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (item: TestimonialRecord) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormRoleTitle(item.roleTitle || '');
    setFormContent(item.content);
    setFormRating(item.rating || 5);
    setFormAvatarUrl(item.avatarUrl || null);
    setFormHasConsent(item.hasConsent);
    setEditModalOpen(true);
  };

  // Save Item
  const handleSaveItem = async () => {
    if (!formName.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!formContent.trim()) {
      toast.error('Feedback content is required.');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        name: formName.trim(),
        roleTitle: formRoleTitle.trim() || undefined,
        content: formContent.trim(),
        rating: formRating,
        avatarUrl: formAvatarUrl || undefined,
        hasConsent: formHasConsent,
      };

      if (editingItem) {
        const res = await apiPatch<{ success: boolean; data: TestimonialRecord }>(
          `/api/cms/testimonials/${editingItem.id}`,
          payload
        );
        if (res.success) {
          toast.success('Testimonial updated.');
          setEditModalOpen(false);
          loadTestimonials();
        }
      } else {
        const res = await apiPost<{ success: boolean; data: TestimonialRecord }>(
          '/api/cms/testimonials',
          payload
        );
        if (res.success) {
          toast.success('Testimonial created as draft.');
          setEditModalOpen(false);
          loadTestimonials();
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Failed to save testimonial.');
    } finally {
      setSavingItem(false);
    }
  };

  // Publish / Unpublish (SUPER_ADMIN only)
  const handleTogglePublish = async (item: TestimonialRecord) => {
    if (!isOwner) {
      toast.error('Only the center owner can publish or unpublish testimonials.');
      return;
    }

    if (!item.isPublished && !item.hasConsent) {
      toast.error('Consent is required before publishing this testimonial.');
      return;
    }

    try {
      if (item.isPublished) {
        const res = await apiPost(`/api/cms/testimonials/${item.id}/unpublish`, {});
        if (res.success) {
          toast.success('Testimonial unpublished.');
          loadTestimonials();
        }
      } else {
        const res = await apiPost(`/api/cms/testimonials/${item.id}/publish`, {});
        if (res.success) {
          toast.success('Testimonial published live.');
          loadTestimonials();
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Failed to update publication status.');
    }
  };

  // Delete
  const handleDeleteItem = async () => {
    if (!isOwner || !deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/cms/testimonials/${deletingItem.id}`);
      if (res.success) {
        toast.success('Testimonial deleted permanently.');
        setDeleteModalOpen(false);
        loadTestimonials();
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Student & Parent Testimonials"
          description="Manage quotes, ratings, and consent for public testimonials. Publication strictly requires explicit consent."
          icon={<MessageSquareQuote className="h-6 w-6 text-primary" aria-hidden="true" />}
          actions={
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleOpenNew}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Testimonial
            </Button>
          }
        />

        {error ? (
          <ErrorState
            title="Failed to load testimonials"
            message={error}
            onRetry={loadTestimonials}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-[var(--radius-card)] border border-border bg-surface space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-16 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            description="The public testimonials section is hidden on your website until published items with consent are added."
            action={
              <Button variant="primary" size="sm" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                Add Testimonial
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((item, index) => {
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-[var(--radius-card)] border border-border bg-surface shadow-xs flex flex-col justify-between space-y-4 hover:border-border/80 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Top Row: User + Featured + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center font-bold text-primary text-sm">
                          {item.avatarUrl ? (
                            <Image
                              src={item.avatarUrl}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            item.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {item.name}
                          </div>
                          {item.roleTitle && (
                            <div className="text-xs text-muted-foreground">
                              {item.roleTitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item)}
                          aria-label={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                          title={item.isFeatured ? 'Featured testimonial' : 'Click to feature'}
                          className={`p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            item.isFeatured
                              ? 'text-warning hover:bg-warning/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                          }`}
                        >
                          <Star
                            className={`h-4 w-4 ${item.isFeatured ? 'fill-warning text-warning' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        <CmsStatusBadge
                          status={item.isPublished ? 'published' : 'draft'}
                        />
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-warning">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < item.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    {/* Quote Content */}
                    <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed line-clamp-4">
                      &ldquo;{item.content}&rdquo;
                    </p>

                    {/* Consent status indicator */}
                    <div>
                      {item.hasConsent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-success-text">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Consent verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          No consent: cannot be published
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Bar: Reorder & Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    {/* Reorder Up/Down */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        aria-label="Move testimonial up"
                        className="h-8 w-8 rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={index === testimonials.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        aria-label="Move testimonial down"
                        className="h-8 w-8 rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 px-2 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Edit
                      </Button>

                      {/* Publish / Unpublish */}
                      {isOwner ? (
                        <Button
                          type="button"
                          variant={item.isPublished ? 'outline' : 'secondary'}
                          size="sm"
                          disabled={!item.isPublished && !item.hasConsent}
                          title={
                            !item.isPublished && !item.hasConsent
                              ? 'Consent is required before publishing'
                              : undefined
                          }
                          onClick={() => handleTogglePublish(item)}
                          className="h-8 px-2 text-xs"
                        >
                          {item.isPublished ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                              Publish
                            </>
                          )}
                        </Button>
                      ) : (
                        <Tooltip content="Only the owner can do this">
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8 px-2 text-xs"
                            >
                              {item.isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                          </div>
                        </Tooltip>
                      )}

                      {/* Delete */}
                      {isOwner ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeletingItem(item);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 px-2 text-xs"
                          aria-label="Delete testimonial"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Tooltip content="Only the owner can do this">
                          <div>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              disabled
                              className="h-8 px-2 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={editingItem ? 'Edit Testimonial' : 'New Testimonial'}
          description="Enter feedback details. Explicit consent is legally required before publishing."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={savingItem}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={savingItem}
                onClick={handleSaveItem}
              >
                {editingItem ? 'Save Changes' : 'Create Draft'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required hint="Max 80 characters">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Sadiya Rahman"
                />
              </FormField>

              <FormField label="Role / Class / Batch" hint="e.g. HSC 2026 Batch">
                <Input
                  value={formRoleTitle}
                  onChange={(e) => setFormRoleTitle(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. HSC 2026 Batch / Student"
                />
              </FormField>
            </div>

            {/* Interactive Rating */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Rating ({formRating} / 5 Stars)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormRating(star)}
                    className="p-1 rounded hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= formRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <FormField label="Student / Parent Photo" hint="Optional. Max 2 MB (PNG, JPG, WebP).">
              <ImageUpload
                value={formAvatarUrl}
                onChange={(url) => setFormAvatarUrl(url)}
                aspectRatio="avatar"
              />
            </FormField>

            {/* Content (Max 500) */}
            <FormField
              label="Testimonial Quote"
              required
              hint={`Feedback message (${formContent.length}/500 chars)`}
            >
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="The coaching mentors here provided extraordinary guidance during my HSC preparation..."
                className="w-full p-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
              />
            </FormField>

            {/* REQUIRED Consent Checkbox */}
            <div className="p-3.5 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formHasConsent}
                  onChange={(e) => setFormHasConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <span className="text-xs text-foreground font-medium leading-relaxed">
                  I have permission from this person (and from a parent or guardian if they are under 18) to publish this
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground pl-6.5">
                Publishing is disabled until consent is granted. Removing consent immediately unpublishes the testimonial.
              </p>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Testimonial?"
          description="Are you sure you want to permanently delete this testimonial?"
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
                onClick={handleDeleteItem}
              >
                Delete Permanently
              </Button>
            </div>
          }
        >
          <div className="p-2 text-sm text-foreground">
            &ldquo;{deletingItem?.name}&rdquo; &mdash; {deletingItem?.content}
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
