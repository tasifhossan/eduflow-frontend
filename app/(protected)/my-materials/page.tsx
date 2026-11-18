'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Folder,
  Layers,
  Presentation,
  HelpCircle,
  Bookmark,
  Video,
  File,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  User,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/tz';
import { useAuth } from '@/components/providers/auth-provider';
import { useCenter } from '@/components/providers/center-provider';
import { RequireRole } from '@/components/providers/require-role';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { toast } from 'sonner';

export type StudyMaterialType =
  | 'PREPARATION'
  | 'NOTES'
  | 'SLIDES'
  | 'PRACTICE'
  | 'QUESTIONS'
  | 'REFERENCE'
  | 'RECORDING'
  | 'OTHER';

interface MaterialAttachment {
  id: string;
  kind: 'FILE' | 'LINK';
  title: string;
  url?: string | null;
  publicId?: string | null;
  format?: string | null;
  bytes?: number | null;
  createdAt: string;
}

interface StudyMaterialItem {
  id: string;
  batchId: string;
  chapterId?: string | null;
  lectureId?: string | null;
  title: string;
  description?: string | null;
  type: StudyMaterialType;
  sortOrder: number;
  isPublished: boolean;
  publishedAt?: string | null;
  availableFrom?: string | null;
  createdAt: string;
  updatedAt: string;
  isNew?: boolean;
  chapter?: { id: string; title: string; order: number } | null;
  lecture?: { id: string; title: string; startsAt: string } | null;
  creator?: { id: string; name: string; email: string } | null;
  attachments?: MaterialAttachment[];
}

interface BatchOption {
  id: string;
  name: string;
  subject?: { id: string; name: string } | null;
}

interface GuardianChild {
  id: string;
  name: string;
  studentCode?: string;
}

const TYPE_CONFIG: Record<StudyMaterialType, { label: string; icon: React.ElementType }> = {
  PREPARATION: { label: 'Preparation', icon: Sparkles },
  NOTES: { label: 'Notes', icon: FileText },
  SLIDES: { label: 'Slides', icon: Presentation },
  PRACTICE: { label: 'Practice Sheet', icon: BookOpen },
  QUESTIONS: { label: 'Question Bank', icon: HelpCircle },
  REFERENCE: { label: 'Reference', icon: Bookmark },
  RECORDING: { label: 'Recording', icon: Video },
  OTHER: { label: 'Other', icon: Layers },
};

export default function MyMaterialsPage() {
  return (
    <RequireRole roles={['STUDENT', 'GUARDIAN']}>
      <MyMaterialsContent />
    </RequireRole>
  );
}

function MyMaterialsContent() {
  const { user } = useAuth();
  const { center } = useCenter();
  const searchParams = useSearchParams();
  const tz = center?.timezone || 'Asia/Dhaka';

  const isGuardian = user?.role === 'GUARDIAN';

  // Guardian children state
  const [children, setChildren] = React.useState<GuardianChild[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');
  const [loadingChildren, setLoadingChildren] = React.useState(isGuardian);

  // Batches state
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>(
    searchParams.get('batchId') || ''
  );
  const [loadingBatches, setLoadingBatches] = React.useState(true);

  // Materials & chapters state
  const [materials, setMaterials] = React.useState<StudyMaterialItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Search & type filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('all');

  // Accordion collapsed state: Map of chapterId (or 'uncategorized') -> boolean (isExpanded)
  const [expandedChapters, setExpandedChapters] = React.useState<Record<string, boolean>>({});

  // Downloading attachment tracking ID
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  // 1. Load Guardian's children if guardian
  React.useEffect(() => {
    if (!isGuardian) return;

    let active = true;
    apiGet<{ success: boolean; data: GuardianChild[] | { children?: GuardianChild[] }; children?: GuardianChild[] }>(
      '/api/guardians/my-students'
    )
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.children || res?.children || []);
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId((prev) => prev || list[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        toast.error('Failed to load linked students');
      })
      .finally(() => {
        if (active) setLoadingChildren(false);
      });

    return () => {
      active = false;
    };
  }, [isGuardian]);

  // 2. Load active enrolled batches
  React.useEffect(() => {
    let active = true;
    if (isGuardian && !selectedChildId) {
      return;
    }

    const url = isGuardian
      ? `/api/batches?studentId=${encodeURIComponent(selectedChildId)}`
      : '/api/batches';

    apiGet<{ success: boolean; data: BatchOption[] | { items?: BatchOption[] } }>(url)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
        setBatches(list);

        // Preselect batch if passed in query and valid, else select first
        const paramBatch = searchParams.get('batchId');
        if (paramBatch && list.some((b) => b.id === paramBatch)) {
          setSelectedBatchId(paramBatch);
        } else if (list.length > 0) {
          setSelectedBatchId(list[0].id);
        } else {
          setSelectedBatchId('');
        }
      })
      .catch((err) => {
        if (!active) return;
        setBatches([]);
        setSelectedBatchId('');
        setError('Failed to load enrolled batches');
      })
      .finally(() => {
        if (active) setLoadingBatches(false);
      });

    return () => {
      active = false;
    };
  }, [isGuardian, selectedChildId, searchParams]);

  // 3. Load materials for selected batch
  const [reloadKey, setReloadKey] = React.useState(0);
  const reloadMaterials = React.useCallback(() => {
    setLoadingMaterials(true);
    setReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!selectedBatchId) return;

    const query = new URLSearchParams();
    query.set('limit', '200');
    if (isGuardian && selectedChildId) {
      query.set('studentId', selectedChildId);
    }

    apiGet<{
      success: boolean;
      data: {
        items: StudyMaterialItem[];
        total: number;
        chapterCounts?: Record<string, number>;
      };
    }>(`/api/batches/${selectedBatchId}/materials?${query.toString()}`)
      .then((res) => {
        if (!active) return;
        if (res?.success && res.data) {
          const items = res.data.items || [];
          setMaterials(items);

          // By default expand all chapters or the one in searchParams
          const paramChapter = searchParams.get('chapterId');
          const initialExpanded: Record<string, boolean> = {};

          items.forEach((m) => {
            const key = m.chapterId || 'uncategorized';
            if (paramChapter) {
              initialExpanded[key] = key === paramChapter;
            } else {
              initialExpanded[key] = true;
            }
          });
          setExpandedChapters((prev) => ({ ...initialExpanded, ...prev }));
        } else {
          setError('Failed to load study materials');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load study materials';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoadingMaterials(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId, isGuardian, selectedChildId, searchParams, reloadKey]);

  // Handle Download
  const handleDownload = async (attachment: MaterialAttachment) => {
    if (attachment.kind === 'LINK') {
      if (attachment.url) {
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setDownloadingId(attachment.id);
    try {
      const query = isGuardian && selectedChildId ? `?studentId=${encodeURIComponent(selectedChildId)}` : '';
      const res = await apiGet<{
        success: boolean;
        message?: string;
        data?: { url: string; expiresAt: string; kind: string };
      }>(`/api/attachments/${attachment.id}/download${query}`);

      if (res?.success && res.data?.url) {
        const link = document.createElement('a');
        link.href = res.data.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = attachment.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error(res?.message || 'Download link expired or unauthorized. Please retry.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access file. Please retry.';
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter materials based on search and type pill
  const filteredMaterials = React.useMemo(() => {
    let list = materials;

    if (selectedType !== 'all') {
      list = list.filter((m) => m.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.chapter && m.chapter.title.toLowerCase().includes(q)) ||
          (m.attachments && m.attachments.some((a) => a.title.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [materials, selectedType, searchQuery]);

  // Group materials by chapter
  const groupedByChapter = React.useMemo(() => {
    interface ChapterGroup {
      id: string; // chapterId or 'uncategorized'
      title: string;
      order: number;
      preparationMaterials: StudyMaterialItem[];
      otherMaterials: StudyMaterialItem[];
      totalCount: number;
    }

    const groups: Record<string, ChapterGroup> = {};

    filteredMaterials.forEach((m) => {
      const key = m.chapterId || 'uncategorized';
      if (!groups[key]) {
        groups[key] = {
          id: key,
          title: m.chapter ? m.chapter.title : 'General / Uncategorized',
          order: m.chapter?.order ?? 9999,
          preparationMaterials: [],
          otherMaterials: [],
          totalCount: 0,
        };
      }

      groups[key].totalCount++;
      if (m.type === 'PREPARATION') {
        groups[key].preparationMaterials.push(m);
      } else {
        groups[key].otherMaterials.push(m);
      }
    });

    return Object.values(groups).sort((a, b) => a.order - b.order);
  }, [filteredMaterials]);

  const toggleChapter = (key: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const updated: Record<string, boolean> = {};
    groupedByChapter.forEach((g) => {
      updated[g.id] = true;
    });
    setExpandedChapters(updated);
  };

  const collapseAll = () => {
    const updated: Record<string, boolean> = {};
    groupedByChapter.forEach((g) => {
      updated[g.id] = false;
    });
    setExpandedChapters(updated);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isGuardian ? "Child's Study Materials" : 'My Study Materials'}
        description={
          isGuardian
            ? "Browse chapter-wise notes, lecture preparation slides, practice problems, and class recordings for your child."
            : 'Access class preparation notes, slides, question banks, and learning reference files.'
        }
      />

      {/* Selectors Bar */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Guardian: Child Selector */}
        {isGuardian && (
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="child-selector"
              className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Select Child</span>
            </label>
            {loadingChildren ? (
              <Skeleton className="h-10 w-full" />
            ) : children.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No linked children found</p>
            ) : (
              <select
                id="child-selector"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.studentCode ? `(${c.studentCode})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Batch Selector */}
        <div className="flex-1 min-w-[220px]">
          <label
            htmlFor="batch-selector"
            className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1.5"
          >
            <Folder className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Select Batch</span>
          </label>
          {loadingBatches ? (
            <Skeleton className="h-10 w-full" />
          ) : batches.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No enrolled batches found</p>
          ) : (
            <select
              id="batch-selector"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.subject ? `· ${b.subject.name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick count badge */}
        {!loadingMaterials && selectedBatchId && (
          <div className="sm:self-end pb-1 text-xs text-muted-foreground shrink-0">
            <span className="font-semibold text-foreground">{filteredMaterials.length}</span> materials available
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      {selectedBatchId && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search materials by title, topic, or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-[var(--radius-control)] border border-border bg-surface text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Expand / Collapse all controls */}
            {groupedByChapter.length > 0 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs h-9 min-h-[36px]"
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs h-9 min-h-[36px]"
                >
                  Collapse All
                </Button>
              </div>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedType === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-foreground border border-border'
              }`}
            >
              All Types
            </button>
            {(Object.keys(TYPE_CONFIG) as StudyMaterialType[]).map((typeKey) => {
              const cfg = TYPE_CONFIG[typeKey];
              const Icon = cfg.icon;
              const isSelected = selectedType === typeKey;

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedType(typeKey)}
                  className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-foreground border border-border'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loadingBatches || loadingMaterials ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load study materials"
          message={error}
          onRetry={reloadMaterials}
        />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-8 w-8 stroke-[1.5]" />}
          title="No batches available"
          description={
            isGuardian
              ? "Your child is not currently enrolled in any active batch."
              : "You are not enrolled in any active batch."
          }
        />
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 stroke-[1.5]" />}
          title="No study materials found"
          description={
            searchQuery || selectedType !== 'all'
              ? 'No materials match your active search or filter selection.'
              : 'Your teachers have not published any study materials for this batch yet.'
          }
          action={
            searchQuery || selectedType !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedByChapter.map((group) => {
            const isExpanded = expandedChapters[group.id] ?? true;

            return (
              <div
                key={group.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden transition-all"
              >
                {/* Chapter Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleChapter(group.id)}
                  aria-expanded={isExpanded}
                  className="w-full min-h-[44px] p-4 sm:p-5 flex items-center justify-between gap-3 text-left bg-surface hover:bg-surface-hover/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-[var(--radius-control)] bg-primary-subtle text-primary border border-border flex items-center justify-center shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-foreground truncate">
                        {group.title}
                      </h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {group.totalCount} {group.totalCount === 1 ? 'material' : 'materials'} available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {group.preparationMaterials.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-secondary/15 text-secondary border border-secondary/30 text-[10px] font-semibold">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        <span>{group.preparationMaterials.length} Before Class</span>
                      </span>
                    )}
                  </div>
                </button>

                {/* Chapter Body */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border/60">
                    {/* Before Class / Preparation Highlight Section */}
                    {group.preparationMaterials.length > 0 && (
                      <div className="p-4 sm:p-5 bg-secondary-subtle/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                            Before Class Preparation
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Review these items before attending the corresponding lecture.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {group.preparationMaterials.map((item) => (
                            <MaterialCard
                              key={item.id}
                              material={item}
                              tz={tz}
                              onDownload={handleDownload}
                              downloadingId={downloadingId}
                              highlight
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Standard Materials Section */}
                    {group.otherMaterials.length > 0 && (
                      <div className="p-4 sm:p-5 space-y-3">
                        {group.preparationMaterials.length > 0 && (
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Coursework, Notes & Reference
                          </h3>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.otherMaterials.map((item) => (
                            <MaterialCard
                              key={item.id}
                              material={item}
                              tz={tz}
                              onDownload={handleDownload}
                              downloadingId={downloadingId}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Individual Material Card Component ──────────────────────────────────────

interface MaterialCardProps {
  material: StudyMaterialItem;
  tz: string;
  onDownload: (att: MaterialAttachment) => void;
  downloadingId: string | null;
  highlight?: boolean;
}

function MaterialCard({
  material,
  tz,
  onDownload,
  downloadingId,
  highlight = false,
}: MaterialCardProps) {
  const cfg = TYPE_CONFIG[material.type] || TYPE_CONFIG.OTHER;
  const TypeIcon = cfg.icon;

  const isNew = material.isNew;
  const attachments = material.attachments || [];

  return (
    <div
      className={`rounded-[var(--radius-control)] border p-4 flex flex-col justify-between transition-colors ${
        highlight
          ? 'border-secondary/40 bg-surface shadow-sm'
          : 'border-border bg-surface hover:bg-surface-hover/40'
      }`}
    >
      <div className="space-y-2">
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-bold uppercase ${
                highlight
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-primary-subtle text-primary border border-border'
              }`}
            >
              <TypeIcon className="h-3 w-3" aria-hidden="true" />
              <span>{cfg.label}</span>
            </span>

            {isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-status-success-bg text-status-success-text border border-status-success-text/30 text-[10px] font-extrabold tracking-wide uppercase">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                <span>New</span>
              </span>
            )}
          </div>

          {material.publishedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              <span>{formatDate(material.publishedAt, tz)}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-foreground leading-snug">
          {material.title}
        </h4>

        {/* Optional Description */}
        {material.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
            {material.description}
          </p>
        )}

        {/* Associated Lecture Notice */}
        {material.lecture && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
            <Calendar className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">For class: {material.lecture.title}</span>
          </div>
        )}
      </div>

      {/* Attachments & Download Buttons */}
      <div className="pt-3 mt-3 border-t border-border/70 space-y-2">
        {attachments.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No attached files or links</p>
        ) : (
          <div className="space-y-1.5">
            {attachments.map((att) => {
              const isFile = att.kind === 'FILE';
              const isBusy = downloadingId === att.id;

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-[var(--radius-control)] bg-surface-hover/60 border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isFile ? (
                      <File className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 text-secondary shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-[11px] font-semibold text-foreground truncate">
                      {att.title}
                    </span>
                    {att.bytes && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({(att.bytes / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDownload(att)}
                    disabled={isBusy}
                    aria-label={isFile ? `Download ${att.title}` : `Open link ${att.title}`}
                    className="min-h-[32px] px-2.5 py-1 rounded-[var(--radius-control)] border border-border bg-surface hover:bg-surface-hover text-foreground text-[11px] font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 transition-colors"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin text-primary" aria-hidden="true" />
                        <span>Opening...</span>
                      </>
                    ) : isFile ? (
                      <>
                        <Download className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span>Download</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3 text-secondary" aria-hidden="true" />
                        <span>Open</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
