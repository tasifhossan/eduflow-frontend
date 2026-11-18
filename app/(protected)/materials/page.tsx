'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Eye,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  ChevronRight,
  Globe,
  Lock,
  Clock,
  Sparkles,
  Edit2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { RequireRole } from '@/components/providers/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  MaterialDialog,
  StudyMaterialType,
  MATERIAL_TYPE_LABELS,
  MaterialItemData,
} from '@/components/materials/material-dialog';
import { CopyMaterialDialog } from '@/components/materials/copy-material-dialog';
import { WhoOpenedDrawer } from '@/components/materials/who-opened-drawer';
import { toast } from 'sonner';

interface BatchItem {
  id: string;
  name: string;
  teacherId?: string | null;
  subject?: { id: string; name: string };
  subjectId?: string;
  isArchived?: boolean;
}

interface ChapterItem {
  id: string;
  name: string;
  subjectId: string;
}

interface LectureOption {
  id: string;
  title: string;
}

interface MaterialAttachment {
  id: string;
  kind: 'FILE' | 'LINK';
  title: string;
  url?: string;
  format?: string;
  bytes?: number;
  originalName?: string;
}

interface StudyMaterialRecord {
  id: string;
  batchId: string;
  chapterId?: string | null;
  lectureId?: string | null;
  title: string;
  description?: string | null;
  type: StudyMaterialType;
  isPublished: boolean;
  availableFrom?: string | null;
  sortOrder: number;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  chapter?: { id: string; name: string } | null;
  lecture?: { id: string; title: string } | null;
  subject?: { id: string; name: string } | null;
  attachments: MaterialAttachment[];
  openedCount?: number;
}

interface MaterialsApiResponse {
  items: StudyMaterialRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  chapterCounts: Record<string, number>;
}

export default function StaffMaterialsPage() {
  const searchParams = useSearchParams();
  const initialBatchIdParam = searchParams.get('batchId');

  const { user } = useAuth();
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';
  const [nowMs] = React.useState(() => Date.now());

  const [batches, setBatches] = React.useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(initialBatchIdParam || '');
  const [chapters, setChapters] = React.useState<ChapterItem[]>([]);
  const [lectures, setLectures] = React.useState<LectureOption[]>([]);

  // Navigation & Filter states
  const [selectedChapterId, setSelectedChapterId] = React.useState<string>('all'); // 'all', 'uncategorized', or chapterId
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  // Materials data
  const [materials, setMaterials] = React.useState<StudyMaterialRecord[]>([]);
  const [chapterCounts, setChapterCounts] = React.useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = React.useState(0);
  const [loadingBatches, setLoadingBatches] = React.useState(true);
  const [loadingChapters, setLoadingChapters] = React.useState(false);
  const [loadingMaterials, setLoadingMaterials] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<MaterialItemData | null>(null);

  const [copyingMaterial, setCopyingMaterial] = React.useState<{ id: string; title: string } | null>(null);
  const [whoOpenedMaterial, setWhoOpenedMaterial] = React.useState<{ id: string; title: string } | null>(null);
  const [deletingMaterial, setDeletingMaterial] = React.useState<StudyMaterialRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 1. Fetch accessible batches
  React.useEffect(() => {
    let active = true;

    apiGet<{ success: boolean; data: { items?: BatchItem[] } | BatchItem[] }>('/api/batches?limit=100')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
        let accessible = list.filter((b) => !b.isArchived);
        if (user?.role === 'TEACHER') {
          accessible = accessible.filter((b) => b.teacherId === user.id);
        }
        setBatches(accessible);

        // Preselect batch if none selected yet
        if (accessible.length > 0) {
          setSelectedBatchId((prev) => {
            if (prev && accessible.some((b) => b.id === prev)) return prev;
            if (initialBatchIdParam && accessible.some((b) => b.id === initialBatchIdParam)) {
              return initialBatchIdParam;
            }
            return accessible[0].id;
          });
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load batches');
      })
      .finally(() => {
        if (active) setLoadingBatches(false);
      });

    return () => {
      active = false;
    };
  }, [user, initialBatchIdParam]);

  // 2. When batch changes, fetch its chapters and lectures
  React.useEffect(() => {
    let active = true;
    if (!selectedBatchId) return;

    // Call /api/batches/:batchId/materials/summary, /api/batches/:batchId and /api/lectures in parallel
    const summaryPromise = apiGet<{
      success: boolean;
      data: {
        chapters?: Array<{
          chapterId: string | null;
          chapterName: string | null;
          total: number;
          drafts: number;
        }>;
        totalMaterials?: number;
      };
    }>(`/api/batches/${selectedBatchId}/materials/summary`)
      .then((res) => (res?.success && res.data ? res.data : null))
      .catch(() => null);

    const batchDetailsPromise = apiGet<{
      success: boolean;
      data: {
        id: string;
        name: string;
        subjectId?: string;
        subject?: { id?: string; name: string };
      };
    }>(`/api/batches/${selectedBatchId}`)
      .then((res) => (res?.success && res.data ? res.data : null))
      .catch(() => null);

    const lecturesPromise = apiGet<{
      success: boolean;
      data: { items?: LectureOption[] } | LectureOption[];
    }>(`/api/lectures?batchId=${selectedBatchId}&limit=100`)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
        return list;
      })
      .catch(() => [] as LectureOption[]);

    Promise.all([summaryPromise, batchDetailsPromise, lecturesPromise])
      .then(async ([summaryData, batchData, lecturesList]) => {
        if (!active) return;

        setLectures(lecturesList);

        // 1. If summaryData returned chapters, use those authoritative curriculum chapters
        if (summaryData?.chapters && summaryData.chapters.length > 0) {
          const list: ChapterItem[] = summaryData.chapters
            .filter((c) => c.chapterId !== null)
            .map((c) => ({
              id: c.chapterId as string,
              name: c.chapterName || 'Untitled Chapter',
              subjectId: batchData?.subjectId || batchData?.subject?.id || '',
            }));

          setChapters(list);

          // Update chapter counts from summary
          const counts: Record<string, number> = {};
          summaryData.chapters.forEach((c) => {
            const key = c.chapterId || 'uncategorized';
            counts[key] = c.total;
          });
          setChapterCounts(counts);
          if (typeof summaryData.totalMaterials === 'number') {
            setTotalCount(summaryData.totalMaterials);
          }
        } else {
          // 2. Fallback: Query /api/chapters?subjectId=... if summary had no chapters or failed
          const resolvedSubjectId =
            batchData?.subjectId ||
            batchData?.subject?.id ||
            batches.find((b) => b.id === selectedBatchId)?.subjectId;

          if (resolvedSubjectId) {
            try {
              const chRes = await apiGet<{ success: boolean; data: ChapterItem[] }>(
                `/api/chapters?subjectId=${resolvedSubjectId}`
              );
              if (active && chRes?.success && Array.isArray(chRes.data)) {
                setChapters(chRes.data);
              } else if (active) {
                setChapters([]);
              }
            } catch {
              if (active) setChapters([]);
            }
          } else {
            setChapters([]);
          }
        }
      })
      .finally(() => {
        if (active) setLoadingChapters(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId, batches]);

  // 3. Fetch materials for selected batch and active filters
  const [reloadTrigger, setReloadTrigger] = React.useState(0);
  const reloadMaterials = React.useCallback(() => {
    setLoadingMaterials(true);
    setReloadTrigger((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!selectedBatchId) return;

    const params = new URLSearchParams();
    params.set('limit', '50');

    if (selectedChapterId === 'uncategorized') {
      // Backend handles uncategorized via chapterId omission with filter
    } else if (selectedChapterId !== 'all') {
      params.set('chapterId', selectedChapterId);
    }

    if (selectedType !== 'all') {
      params.set('type', selectedType);
    }

    if (selectedStatus === 'published' || selectedStatus === 'draft') {
      params.set('status', selectedStatus);
    } else {
      params.set('status', 'all');
    }

    if (debouncedQuery) {
      params.set('q', debouncedQuery);
    }

    apiGet<{ success: boolean; data: MaterialsApiResponse }>(
      `/api/batches/${selectedBatchId}/materials?${params.toString()}`
    )
      .then((res) => {
        if (!active) return;
        if (res && res.success && res.data) {
          let items = res.data.items || [];
          if (selectedChapterId === 'uncategorized') {
            items = items.filter((m) => !m.chapterId);
          }
          if (selectedStatus === 'scheduled') {
            const now = new Date();
            items = items.filter(
              (m) => m.isPublished && m.availableFrom && new Date(m.availableFrom) > now
            );
          }
          setMaterials(items);
          setChapterCounts(res.data.chapterCounts || {});
          setTotalCount(res.data.total || items.length);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load study materials');
      })
      .finally(() => {
        if (active) setLoadingMaterials(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId, selectedChapterId, selectedType, selectedStatus, debouncedQuery, reloadTrigger]);

  // Actions
  const handleTogglePublish = async (material: StudyMaterialRecord) => {
    try {
      if (material.isPublished) {
        const res = await apiPost(`/api/materials/${material.id}/unpublish`, {});
        if (res && res.success) {
          toast.success('Material unpublished');
          reloadMaterials();
        }
      } else {
        const res = await apiPost(`/api/materials/${material.id}/publish`, { notify: false });
        if (res && res.success) {
          toast.success('Material published');
          reloadMaterials();
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating publish status');
    }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/materials/${deletingMaterial.id}`);
      if (res && res.success) {
        toast.success('Material deleted successfully');
        setDeletingMaterial(null);
        reloadMaterials();
      } else {
        toast.error(res.message || 'Failed to delete material');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting material');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async (currentIndex: number, targetIndex: number) => {
    if (currentIndex < 0 || targetIndex < 0 || currentIndex >= materials.length || targetIndex >= materials.length)
      return;

    const list = [...materials];
    const [moved] = list.splice(currentIndex, 1);
    list.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setMaterials(list);

    try {
      const ids = list.map((m) => m.id);
      const res = await apiPut(`/api/batches/${selectedBatchId}/materials/order`, { ids });
      if (res && res.success) {
        toast.success('Material order saved');
      } else {
        reloadMaterials();
      }
    } catch {
      toast.error('Failed to update material order');
      reloadMaterials();
    }
  };

  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <RequireRole roles={['ADMIN', 'TEACHER', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-4">
          <div>
            <nav className="flex items-center text-xs text-muted-foreground gap-1.5 mb-1" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-foreground font-semibold">Study Materials</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Study Materials Library
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Manage preparation resources, lecture notes, slides, and practice problem sheets
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Batch Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="batch-select" className="text-xs font-semibold text-foreground shrink-0 hidden sm:block">
                Batch:
              </label>
              <select
                id="batch-select"
                value={selectedBatchId}
                onChange={(e) => {
                  const newBatchId = e.target.value;
                  setSelectedBatchId(newBatchId);
                  setSelectedChapterId('all');
                  setChapters([]);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('batchId', newBatchId);
                    window.history.replaceState(null, '', url.toString());
                  }
                }}
                disabled={loadingBatches || batches.length === 0}
                className="rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingMaterial(null);
                setIsAddModalOpen(true);
              }}
              disabled={!selectedBatchId}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add Material</span>
            </Button>
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load study materials"
            message={error}
            onRetry={reloadMaterials}
          />
        )}

        {/* Main Content Layout: Chapter Sidebar + Materials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Chapter Navigation Sidebar */}
          <div className="lg:col-span-1 rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Chapters</h3>
              <span className="text-[11px] text-muted-foreground font-mono">{totalCount} total</span>
            </div>

            <nav className="space-y-1" aria-label="Chapter filter">
              {/* All Materials */}
              <button
                type="button"
                onClick={() => setSelectedChapterId('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedChapterId === 'all'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">All Materials</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    selectedChapterId === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              {/* General (No Chapter) */}
              <button
                type="button"
                onClick={() => setSelectedChapterId('uncategorized')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedChapterId === 'uncategorized'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">General (No Chapter)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    selectedChapterId === 'uncategorized'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {chapterCounts.uncategorized || 0}
                </span>
              </button>

              {/* Subject Chapters */}
              {loadingChapters ? (
                <div className="space-y-1.5 py-1">
                  <div className="h-8 rounded-[var(--radius-control)] bg-muted/60 animate-pulse" />
                  <div className="h-8 rounded-[var(--radius-control)] bg-muted/60 animate-pulse" />
                  <div className="h-8 rounded-[var(--radius-control)] bg-muted/60 animate-pulse" />
                </div>
              ) : chapters.length === 0 ? (
                <div className="py-3 px-2 text-center text-[11px] text-muted-foreground border border-dashed border-border rounded-[var(--radius-control)] my-1">
                  No chapters linked to this batch subject
                </div>
              ) : (
                chapters.map((ch, idx) => {
                  const count = chapterCounts[ch.id] || 0;
                  const isSelected = selectedChapterId === ch.id;

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChapterId(ch.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate" title={ch.name}>
                          {ch.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </nav>
          </div>

          {/* Materials Section */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filter Bar */}
            <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-4 space-y-3">
              {/* Type Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1.5 rounded-[var(--radius-pill)] font-semibold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedType === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  All Types
                </button>
                {(Object.keys(MATERIAL_TYPE_LABELS) as StudyMaterialType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-1.5 rounded-[var(--radius-pill)] font-semibold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedType === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    }`}
                  >
                    {t === 'PREPARATION' ? 'Preparation' : MATERIAL_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search materials by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <label htmlFor="status-filter" className="text-xs font-semibold text-foreground shrink-0">
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as 'all' | 'published' | 'draft' | 'scheduled')
                    }
                    className="rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published Only</option>
                    <option value="draft">Drafts Only</option>
                    <option value="scheduled">Scheduled Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Materials List / Cards */}
            {loadingMaterials ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
                <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
                <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
              </div>
            ) : materials.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6 stroke-[1.5]" />}
                title="No study materials found"
                description={
                  debouncedQuery || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'No study materials match your current search and filter criteria.'
                    : 'Start organizing your curriculum by uploading preparation guides, slides, or class notes.'
                }
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingMaterial(null);
                      setIsAddModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add First Material</span>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {materials.map((mat, idx) => {
                  const fileAttachments = mat.attachments?.filter((a) => a.kind === 'FILE') || [];
                  const linkAttachments = mat.attachments?.filter((a) => a.kind === 'LINK') || [];
                  const isScheduled =
                    mat.isPublished &&
                    mat.availableFrom &&
                    new Date(mat.availableFrom).getTime() > nowMs;

                  return (
                    <div
                      key={mat.id}
                      className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 shadow-card hover:border-primary/40 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-foreground truncate">{mat.title}</h4>
                            {mat.isNew && (
                              <Badge variant="primary" size="sm" className="font-extrabold uppercase text-[10px] gap-1">
                                <Sparkles className="h-3 w-3" />
                                <span>New</span>
                              </Badge>
                            )}
                            <Badge variant="secondary" size="sm">
                              {MATERIAL_TYPE_LABELS[mat.type] || mat.type}
                            </Badge>
                            {isScheduled ? (
                              <Badge variant="warning" size="sm" className="gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Scheduled</span>
                              </Badge>
                            ) : mat.isPublished ? (
                              <Badge variant="success" size="sm" className="gap-1">
                                <Globe className="h-3 w-3" />
                                <span>Published</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" className="gap-1 opacity-70">
                                <Lock className="h-3 w-3" />
                                <span>Draft</span>
                              </Badge>
                            )}
                          </div>

                          {mat.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {mat.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-1">
                            {mat.chapter ? (
                              <span>
                                Chapter: <strong>{mat.chapter.name}</strong>
                              </span>
                            ) : (
                              <span>General Material</span>
                            )}
                            {mat.lecture && (
                              <span>
                                · Lecture: <strong>{mat.lecture.title}</strong>
                              </span>
                            )}
                            {fileAttachments.length > 0 && (
                              <span>· {fileAttachments.length} file(s)</span>
                            )}
                            {linkAttachments.length > 0 && (
                              <span>· {linkAttachments.length} link(s)</span>
                            )}
                            {mat.availableFrom && (
                              <span>· Available {formatDate(mat.availableFrom, tz)}</span>
                            )}
                          </div>
                        </div>

                        {/* Top-Right Reorder buttons */}
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, idx - 1)}
                            disabled={idx === 0}
                            aria-label="Move material up"
                            className="h-7 w-7 rounded-[var(--radius-control)] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, idx + 1)}
                            disabled={idx === materials.length - 1}
                            aria-label="Move material down"
                            className="h-7 w-7 rounded-[var(--radius-control)] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border text-xs">
                        <div className="flex items-center gap-2">
                          {/* Who opened it button */}
                          <button
                            type="button"
                            onClick={() => setWhoOpenedMaterial({ id: mat.id, title: mat.title })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-control)] border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            <span>Who opened it</span>
                          </button>

                          {/* Copy to other batches */}
                          <button
                            type="button"
                            onClick={() => setCopyingMaterial({ id: mat.id, title: mat.title })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-control)] border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Copy</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Publish / Unpublish Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePublish(mat)}
                            className="h-7 text-xs"
                          >
                            {mat.isPublished ? 'Unpublish' : 'Publish'}
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingMaterial(mat);
                              setIsAddModalOpen(true);
                            }}
                            className="h-7 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            <span>Edit</span>
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingMaterial(mat)}
                            className="h-7 text-xs text-danger hover:bg-status-danger-bg hover:border-status-danger-border"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add / Edit Material Dialog */}
        <MaterialDialog
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingMaterial(null);
          }}
          batchId={selectedBatchId}
          chapters={chapters}
          lectures={lectures}
          initialMaterial={editingMaterial}
          preselectedChapterId={selectedChapterId !== 'all' && selectedChapterId !== 'uncategorized' ? selectedChapterId : null}
          onSaved={reloadMaterials}
        />

        {/* Copy Material Dialog */}
        {copyingMaterial && (
          <CopyMaterialDialog
            isOpen={Boolean(copyingMaterial)}
            onClose={() => setCopyingMaterial(null)}
            materialId={copyingMaterial.id}
            materialTitle={copyingMaterial.title}
            currentBatchId={selectedBatchId}
            onCopied={reloadMaterials}
          />
        )}

        {/* Who Opened It Drawer */}
        {whoOpenedMaterial && (
          <WhoOpenedDrawer
            isOpen={Boolean(whoOpenedMaterial)}
            onClose={() => setWhoOpenedMaterial(null)}
            materialId={whoOpenedMaterial.id}
            materialTitle={whoOpenedMaterial.title}
          />
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(deletingMaterial)}
          onClose={() => setDeletingMaterial(null)}
          title="Delete Study Material"
          description={`Are you sure you want to delete "${deletingMaterial?.title}"?`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action permanently removes this material and its learning attachments for all learners in this batch.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingMaterial(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>
                Delete Material
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
