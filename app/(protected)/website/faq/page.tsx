'use client';

import * as React from 'react';
import {
  HelpCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Sparkles,
  Send,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CmsStatusBadge } from '@/components/content/status-badges';
import { LastUpdatedLine } from '@/components/content/last-updated-line';
import { SafeText } from '@/components/content/safe-text';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api';

interface FaqRecord {
  id: string;
  question: string;
  answer?: string | null;
  category?: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { id: string; name: string } | null;
}

export default function WebsiteFaqPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = React.useState<FaqRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Suggestions state
  const [suggesting, setSuggesting] = React.useState(false);

  // Add / Edit Modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<FaqRecord | null>(null);
  const [formQuestion, setFormQuestion] = React.useState('');
  const [formAnswer, setFormAnswer] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('General');
  const [savingItem, setSavingItem] = React.useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingItem, setDeletingItem] = React.useState<FaqRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Load FAQ list
  const loadFaq = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: boolean; data: { items: FaqRecord[] } }>('/api/cms/faq?limit=100');
      if (res.success && res.data?.items) {
        setItems(res.data.items);
      } else {
        setError('Failed to load FAQ items.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading FAQ.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiGet<{ success: boolean; data: { items: FaqRecord[] } }>('/api/cms/faq?limit=100')
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data?.items) {
          setItems(res.data.items);
        } else {
          setError('Failed to load FAQ items.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error loading FAQ.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Insert suggested admission questions
  const handleAddSuggestions = async () => {
    setSuggesting(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>('/api/cms/faq/suggestions', {});
      if (res.success) {
        toast.success(
          'Added suggested admission questions as drafts. Write answers before publishing.'
        );
        loadFaq();
      } else {
        toast.error('Failed to add suggested questions.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Error adding suggestions.');
    } finally {
      setSuggesting(false);
    }
  };

  // Reorder items
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const nextItems = [...items];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;

    setItems(nextItems);

    try {
      const ids = nextItems.map((i) => i.id);
      await apiPut('/api/cms/faq/order', { ids });
    } catch {
      toast.error('Failed to save reordered FAQ.');
      loadFaq();
    }
  };

  // Open modal for new item
  const handleOpenNew = () => {
    setEditingItem(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('General');
    setEditModalOpen(true);
  };

  // Open modal for editing existing item
  const handleOpenEdit = (item: FaqRecord) => {
    setEditingItem(item);
    setFormQuestion(item.question);
    setFormAnswer(item.answer || '');
    setFormCategory(item.category || 'General');
    setEditModalOpen(true);
  };

  // Save FAQ item
  const handleSaveItem = async () => {
    if (!formQuestion.trim()) {
      toast.error('Question is required.');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        question: formQuestion.trim(),
        answer: formAnswer.trim() || undefined,
        category: formCategory.trim() || 'General',
      };

      if (editingItem) {
        const res = await apiPatch<{ success: boolean; data: FaqRecord }>(
          `/api/cms/faq/${editingItem.id}`,
          payload
        );
        if (res.success) {
          toast.success('FAQ item updated.');
          setEditModalOpen(false);
          loadFaq();
        } else {
          toast.error('Failed to update FAQ.');
        }
      } else {
        const res = await apiPost<{ success: boolean; data: FaqRecord }>('/api/cms/faq', payload);
        if (res.success) {
          toast.success('FAQ item created as draft.');
          setEditModalOpen(false);
          loadFaq();
        } else {
          toast.error('Failed to create FAQ.');
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Failed to save FAQ.');
    } finally {
      setSavingItem(false);
    }
  };

  // Publish / Unpublish FAQ item
  const handleTogglePublish = async (item: FaqRecord) => {
    if (!isOwner) {
      toast.error('Only the owner can publish or unpublish FAQ items.');
      return;
    }

    if (!item.isPublished && (!item.answer || !item.answer.trim())) {
      toast.error('An answer is required before publishing this question.');
      return;
    }

    try {
      if (item.isPublished) {
        const res = await apiPost(`/api/cms/faq/${item.id}/unpublish`, {});
        if (res.success) {
          toast.success('Question unpublished.');
          loadFaq();
        }
      } else {
        const res = await apiPost(`/api/cms/faq/${item.id}/publish`, {});
        if (res.success) {
          toast.success('Question published.');
          loadFaq();
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Failed to update visibility.');
    }
  };

  // Delete FAQ
  const handleDeleteItem = async () => {
    if (!isOwner || !deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/cms/faq/${deletingItem.id}`);
      if (res.success) {
        toast.success('FAQ item deleted.');
        setDeleteModalOpen(false);
        loadFaq();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Frequently Asked Questions"
          description="Manage questions and answers displayed in the public FAQ section. Drafts without answers cannot be published."
          icon={<HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                isLoading={suggesting}
                onClick={handleAddSuggestions}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Add Suggested Questions
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleOpenNew}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Question
              </Button>
            </div>
          }
        />

        {error ? (
          <ErrorState
            title="Failed to load FAQ"
            message={error}
            onRetry={loadFaq}
          />
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-[var(--radius-card)] border border-border bg-surface space-y-2">
                <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No FAQ items yet"
            description="The public FAQ section is hidden on your website until published questions are added. You can create a question or insert common admission templates."
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={suggesting}
                  onClick={handleAddSuggestions}
                >
                  <Sparkles className="h-4 w-4 mr-1 text-primary" aria-hidden="true" />
                  Add Suggested Questions
                </Button>
                <Button variant="primary" size="sm" onClick={handleOpenNew}>
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  Add Question
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const catItems = items.filter((i) => (i.category || 'General') === cat);
              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      {cat}
                    </h2>
                    <Badge variant="primary" size="sm">
                      {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {catItems.map((item) => {
                      const overallIndex = items.findIndex((x) => x.id === item.id);
                      const hasNoAnswer = !item.answer || !item.answer.trim();

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-xs space-y-3 hover:border-border/80 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-foreground">
                                  {item.question}
                                </span>
                                <CmsStatusBadge
                                  status={item.isPublished ? 'published' : 'draft'}
                                />
                                {hasNoAnswer && (
                                  <span className="text-[11px] font-medium text-warning flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                                    No answer yet
                                  </span>
                                )}
                              </div>
                              {item.answer ? (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  <SafeText content={item.answer} />
                                </div>
                              ) : (
                                <p className="text-xs italic text-muted-foreground mt-1">
                                  Empty answer. Edit to add an answer before publishing.
                                </p>
                              )}
                            </div>

                            {/* Reorder and Action controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={overallIndex === 0}
                                onClick={() => handleMove(overallIndex, 'up')}
                                aria-label="Move question up"
                                className="h-8 w-8 rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                disabled={overallIndex === items.length - 1}
                                onClick={() => handleMove(overallIndex, 'down')}
                                aria-label="Move question down"
                                className="h-8 w-8 rounded-[var(--radius-control)] border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>

                              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

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

                              {/* Publish / Unpublish Button */}
                              {isOwner ? (
                                <Button
                                  type="button"
                                  variant={item.isPublished ? 'outline' : 'secondary'}
                                  size="sm"
                                  disabled={!item.isPublished && hasNoAnswer}
                                  title={
                                    !item.isPublished && hasNoAnswer
                                      ? 'An answer is required before publishing'
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
                                  aria-label="Delete question"
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

                          <LastUpdatedLine
                            updatedAt={item.updatedAt}
                            updatedByName={item.updatedBy?.name}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Drawer Modal with Live Accordion Preview */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={editingItem ? 'Edit FAQ Item' : 'New FAQ Item'}
          description="Questions and answers support the standard markdown formatting subset."
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
            <FormField
              label="Question"
              required
              hint="Maximum 200 characters"
            >
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                maxLength={200}
                placeholder="e.g. What is the batch schedule for HSC 2027?"
              />
            </FormField>

            <FormField
              label="Category"
              required
              hint="Group questions together (e.g. Admissions, Fees, Classes)"
            >
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                maxLength={40}
                placeholder="e.g. Admissions"
              />
            </FormField>

            <FormField
              label="Answer"
              hint="Max 2000 characters. Supports bold, italic, lists, and links."
            >
              <textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Write the detailed answer here..."
                className="w-full p-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y leading-relaxed"
              />
            </FormField>

            {/* Live Accordion Preview */}
            <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Live Accordion Preview
              </span>
              <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface">
                <div className="font-semibold text-sm text-foreground">
                  {formQuestion.trim() || 'Your question here?'}
                </div>
                <div className="mt-2 text-xs text-muted-foreground border-t border-border/60 pt-2">
                  {formAnswer.trim() ? (
                    <SafeText content={formAnswer} />
                  ) : (
                    <span className="italic text-muted-foreground">Answer text will appear here.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete FAQ Item?"
          description="Are you sure you want to permanently delete this question?"
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
            &ldquo;{deletingItem?.question}&rdquo;
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
