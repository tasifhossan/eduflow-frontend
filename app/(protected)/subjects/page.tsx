'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { RequireRole } from '@/components/providers/require-role';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  GraduationCap,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
  subjectId: string;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'subjects' | 'chapters'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subject Modal State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Add Chapter Modal State
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [targetSubjectForAdd, setTargetSubjectForAdd] = useState<Subject | null>(null);
  const [newChapterName, setNewChapterName] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  // Edit Chapter Modal State
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editChapterName, setEditChapterName] = useState('');
  const [savingEditChapter, setSavingEditChapter] = useState(false);
  const [editChapterError, setEditChapterError] = useState<string | null>(null);

  // Chapters per subject cache
  const [chaptersMap, setChaptersMap] = useState<Record<string, Chapter[]>>({});
  const [loadingChaptersMap, setLoadingChaptersMap] = useState<Record<string, boolean>>({});

  const fetchChapters = useCallback(async (subjectId: string) => {
    setLoadingChaptersMap((prev) => ({ ...prev, [subjectId]: true }));
    try {
      const res = await apiGet<{ success: boolean; data: Chapter[] }>(`/api/chapters?subjectId=${subjectId}`);
      if (res && res.success && res.data) {
        setChaptersMap((prev) => ({ ...prev, [subjectId]: res.data }));
      }
    } catch (err: unknown) {
      console.error(`Error loading chapters for subject ${subjectId}:`, err);
    } finally {
      setLoadingChaptersMap((prev) => ({ ...prev, [subjectId]: false }));
    }
  }, []);

  const [reloadKey, setReloadKey] = useState(0);
  const reloadSubjects = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;
    apiGet<{ success: boolean; data: Subject[] }>('/api/subjects')
      .then((res) => {
        if (!active) return;
        if (res && res.success && res.data) {
          setSubjects(res.data);
          if (res.data.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(res.data[0].id);
          }
          for (const sub of res.data) {
            fetchChapters(sub.id);
          }
        } else {
          setErrorMsg('Failed to load subjects');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Error loading subjects');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchChapters, selectedSubjectId, reloadKey]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setSubjectError('Subject name is required');
      return;
    }

    setSavingSubject(true);
    setSubjectError(null);

    try {
      const response = await apiPost('/api/subjects', {
        name: newSubjectName.trim(),
      });

      if (response && response.success) {
        setNewSubjectName('');
        setIsAddSubjectOpen(false);
        toast.success('Subject created successfully');
        reloadSubjects();
      } else {
        setSubjectError(response.message || 'Failed to create subject');
      }
    } catch (err: unknown) {
      setSubjectError(err instanceof Error ? err.message : 'An error occurred while creating subject');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubjectId = targetSubjectForAdd?.id || selectedSubjectId;
    if (!targetSubjectId || !newChapterName.trim()) {
      setChapterError('Chapter name is required');
      return;
    }

    setSavingChapter(true);
    setChapterError(null);

    try {
      const response = await apiPost('/api/chapters', {
        name: newChapterName.trim(),
        subjectId: targetSubjectId,
      });

      if (response && response.success) {
        setNewChapterName('');
        setIsAddChapterOpen(false);
        setTargetSubjectForAdd(null);
        toast.success('Chapter added successfully');
        await fetchChapters(targetSubjectId);
      } else {
        setChapterError(response.message || 'Failed to create chapter');
      }
    } catch (err: unknown) {
      setChapterError(err instanceof Error ? err.message : 'An error occurred while creating chapter');
    } finally {
      setSavingChapter(false);
    }
  };

  const handleEditChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !editChapterName.trim()) {
      setEditChapterError('Chapter name is required');
      return;
    }

    setSavingEditChapter(true);
    setEditChapterError(null);

    try {
      const response = await apiPatch(`/api/chapters/${editingChapter.id}`, {
        name: editChapterName.trim(),
      });

      if (response && response.success) {
        const subId = editingChapter.subjectId;
        setEditingChapter(null);
        setEditChapterName('');
        toast.success('Chapter updated successfully');
        await fetchChapters(subId);
      } else {
        setEditChapterError(response.message || 'Failed to update chapter');
      }
    } catch (err: unknown) {
      setEditChapterError(err instanceof Error ? err.message : 'An error occurred while updating chapter');
    } finally {
      setSavingEditChapter(false);
    }
  };

  const moveChapter = (subjectId: string, fromIndex: number, toIndex: number) => {
    const list = [...(chaptersMap[subjectId] || [])];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    setChaptersMap((prev) => ({ ...prev, [subjectId]: list }));
    toast.info('Chapter reordered in view (curriculum sequence updated)');
  };

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-4">
          <div>
            <nav className="flex items-center text-xs text-muted-foreground gap-1.5 mb-1" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">Dashboard</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-foreground font-semibold">Subjects & Chapters</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Curriculum Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Manage academic subjects and chapter structures required for study materials and syllabus progress
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'subjects' ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSubjectError(null);
                  setIsAddSubjectOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Subject</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setChapterError(null);
                  const curSub = subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null;
                  setTargetSubjectForAdd(curSub);
                  setIsAddChapterOpen(true);
                }}
                disabled={subjects.length === 0}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Chapter</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border gap-2" role="tablist" aria-label="Curriculum tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'subjects'}
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors -mb-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'subjects'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            <span>Subjects ({subjects.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chapters'}
            onClick={() => setActiveTab('chapters')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors -mb-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === 'chapters'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Chapters</span>
          </button>
        </div>

        {/* Error message display */}
        {errorMsg && (
          <div className="rounded-[var(--radius-control)] bg-status-danger-bg p-4 border border-status-danger-border">
            <p className="text-xs text-status-danger-text">
              <span className="font-semibold">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
          </div>
        ) : activeTab === 'subjects' ? (
          /* SUBJECTS TAB */
          subjects.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-6 w-6 stroke-[1.5]" />}
              title="No subjects created yet"
              description="Subjects group chapters, lectures, tests, and study materials for batches."
              action={
                <Button size="sm" onClick={() => setIsAddSubjectOpen(true)}>
                  Create Subject
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {subjects.map((subject) => {
                const chapters = chaptersMap[subject.id] || [];
                const isLoadingChapters = loadingChaptersMap[subject.id];

                return (
                  <div
                    key={subject.id}
                    className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-surface-hover/30 border-b border-border flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground">{subject.name}</h2>
                        <p className="text-xs text-muted-foreground">{chapters.length} Chapters configured</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetSubjectForAdd(subject);
                          setChapterError(null);
                          setIsAddChapterOpen(true);
                        }}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Add Chapter</span>
                      </Button>
                    </div>

                    <div className="p-5">
                      {isLoadingChapters ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
                          <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
                        </div>
                      ) : chapters.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No chapters created for this subject yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {chapters.map((ch, index) => (
                            <div
                              key={ch.id}
                              className="flex items-center gap-2.5 p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/40"
                            >
                              <span className="h-6 w-6 rounded-full bg-primary-subtle text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate" title={ch.name}>
                                {ch.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* CHAPTERS TAB */
          <div className="space-y-5">
            {/* Subject Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
              <div className="flex items-center gap-3">
                <label htmlFor="subject-filter" className="text-xs font-semibold text-foreground shrink-0">
                  Select Subject:
                </label>
                <select
                  id="subject-filter"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const curSub = subjects.find((s) => s.id === selectedSubjectId) || null;
                  setTargetSubjectForAdd(curSub);
                  setChapterError(null);
                  setIsAddChapterOpen(true);
                }}
                disabled={!selectedSubjectId}
                className="gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Chapter</span>
              </Button>
            </div>

            {/* Chapters List for Selected Subject */}
            {(() => {
              const currentChapters = chaptersMap[selectedSubjectId] || [];
              const isLoadingCurrent = loadingChaptersMap[selectedSubjectId];

              if (isLoadingCurrent) {
                return (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full rounded-[var(--radius-card)]" />
                    <Skeleton className="h-14 w-full rounded-[var(--radius-card)]" />
                    <Skeleton className="h-14 w-full rounded-[var(--radius-card)]" />
                  </div>
                );
              }

              if (currentChapters.length === 0) {
                return (
                  <EmptyState
                    icon={<BookOpen className="h-6 w-6 stroke-[1.5]" />}
                    title="No chapters created yet"
                    description="Batches require chapters to organize study materials, lecture topics, and track syllabus progress."
                    action={
                      <Button
                        size="sm"
                        onClick={() => {
                          const curSub = subjects.find((s) => s.id === selectedSubjectId) || null;
                          setTargetSubjectForAdd(curSub);
                          setChapterError(null);
                          setIsAddChapterOpen(true);
                        }}
                      >
                        + Add Chapter
                      </Button>
                    }
                  />
                );
              }

              return (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden divide-y divide-border">
                  {currentChapters.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-surface-hover/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-7 w-7 rounded-full bg-primary-subtle text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{ch.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Subject: {subjects.find((s) => s.id === ch.subjectId)?.name || 'Curriculum'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          onClick={() => moveChapter(ch.subjectId, idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label={`Move ${ch.name} up`}
                          className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChapter(ch.subjectId, idx, idx + 1)}
                          disabled={idx === currentChapters.length - 1}
                          aria-label={`Move ${ch.name} down`}
                          className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        {/* Edit Button (Owner only) */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChapter(ch);
                              setEditChapterName(ch.name);
                              setEditChapterError(null);
                            }}
                            aria-label={`Edit ${ch.name}`}
                            className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Add Subject Modal */}
        <Modal
          isOpen={isAddSubjectOpen}
          onClose={() => setIsAddSubjectOpen(false)}
          title="Add New Subject"
          description="Create a curriculum subject (e.g. Physics, Higher Mathematics)"
        >
          {subjectError && (
            <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border mb-4">
              {subjectError}
            </div>
          )}
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label htmlFor="subject-name" className="block text-xs font-semibold text-foreground mb-1">
                Subject Name <span className="text-danger">*</span>
              </label>
              <input
                id="subject-name"
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Physics, Chemistry, Biology"
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSubjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={savingSubject}>
                Create Subject
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Chapter Modal */}
        <Modal
          isOpen={isAddChapterOpen}
          onClose={() => {
            setIsAddChapterOpen(false);
            setTargetSubjectForAdd(null);
          }}
          title="Add Chapter"
          description={
            targetSubjectForAdd
              ? `Add a chapter to ${targetSubjectForAdd.name}`
              : 'Add a new chapter to the curriculum'
          }
        >
          {chapterError && (
            <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border mb-4">
              {chapterError}
            </div>
          )}
          <form onSubmit={handleCreateChapter} className="space-y-4">
            {!targetSubjectForAdd && (
              <div>
                <label htmlFor="chapter-subject-select" className="block text-xs font-semibold text-foreground mb-1">
                  Subject <span className="text-danger">*</span>
                </label>
                <select
                  id="chapter-subject-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="chapter-name" className="block text-xs font-semibold text-foreground mb-1">
                Chapter Title <span className="text-danger">*</span>
              </label>
              <input
                id="chapter-name"
                type="text"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="e.g. Chapter 1: Newton's Laws of Motion"
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddChapterOpen(false);
                  setTargetSubjectForAdd(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={savingChapter}>
                Add Chapter
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Chapter Modal */}
        <Modal
          isOpen={Boolean(editingChapter)}
          onClose={() => setEditingChapter(null)}
          title="Edit Chapter"
          description="Update the chapter title for this curriculum subject"
        >
          {editChapterError && (
            <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border mb-4">
              {editChapterError}
            </div>
          )}
          <form onSubmit={handleEditChapter} className="space-y-4">
            <div>
              <label htmlFor="edit-chapter-name" className="block text-xs font-semibold text-foreground mb-1">
                Chapter Title <span className="text-danger">*</span>
              </label>
              <input
                id="edit-chapter-name"
                type="text"
                value={editChapterName}
                onChange={(e) => setEditChapterName(e.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingChapter(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={savingEditChapter}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </RequireRole>
  );
}
