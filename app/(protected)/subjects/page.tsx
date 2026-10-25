'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

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
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subject Modal State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Chapter Modal State
  const [activeSubjectForChapter, setActiveSubjectForChapter] = useState<Subject | null>(null);
  const [newChapterName, setNewChapterName] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  // Chapters per subject cache
  const [chaptersMap, setChaptersMap] = useState<Record<string, Chapter[]>>({});
  const [loadingChaptersMap, setLoadingChaptersMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function checkAuthAndLoad() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadSubjects();
    }
    checkAuthAndLoad();
  }, [router]);

  async function loadSubjects() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiGet<{ success: boolean; data: Subject[] }>('/api/subjects');
      if (res && res.success && res.data) {
        setSubjects(res.data);
        // Automatically fetch chapters for all subjects
        for (const sub of res.data) {
          fetchChapters(sub.id);
        }
      } else {
        setErrorMsg('Failed to load subjects');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading subjects');
    } fontally: {
      setLoading(false);
    }
  }

  async function fetchChapters(subjectId: string) {
    setLoadingChaptersMap((prev) => ({ ...prev, [subjectId]: true }));
    try {
      const res = await apiGet<{ success: boolean; data: Chapter[] }>(`/api/chapters?subjectId=${subjectId}`);
      if (res && res.success && res.data) {
        setChaptersMap((prev) => ({ ...prev, [subjectId]: res.data }));
      }
    } catch (err) {
      console.error(`Failed to load chapters for subject ${subjectId}`, err);
    } finally {
      setLoadingChaptersMap((prev) => ({ ...prev, [subjectId]: false }));
    }
  }

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
        await loadSubjects();
      } else {
        setSubjectError(response.message || 'Failed to create subject');
      }
    } catch (err: any) {
      setSubjectError(err.message || 'An error occurred while creating subject');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubjectForChapter || !newChapterName.trim()) {
      setChapterError('Chapter name is required');
      return;
    }

    setSavingChapter(true);
    setChapterError(null);

    try {
      const response = await apiPost('/api/chapters', {
        name: newChapterName.trim(),
        subjectId: activeSubjectForChapter.id,
      });

      if (response && response.success) {
        setNewChapterName('');
        const targetSubjectId = activeSubjectForChapter.id;
        setActiveSubjectForChapter(null);
        await fetchChapters(targetSubjectId);
      } else {
        setChapterError(response.message || 'Failed to create chapter');
      }
    } catch (err: any) {
      setChapterError(err.message || 'An error occurred while creating chapter');
    } finally {
      setSavingChapter(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading subjects...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-y-3">
        <div>
          <nav className="flex text-sm text-muted-foreground gap-x-2 mb-1">
            <Link href="/dashboard" className="hover:text-primary font-medium">Dashboard</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Subjects</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subject & Chapter Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize academic curriculum subjects and chapter topics</p>
        </div>

        <button
          onClick={() => {
            setSubjectError(null);
            setIsAddSubjectOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition"
        >
          + Add Subject
        </button>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600">
            <span className="font-semibold text-red-800">Error:</span> {errorMsg}
          </p>
        </div>
      )}

      {/* Subjects & Chapters List */}
      {subjects.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center shadow-card">
          <p className="text-base font-semibold text-foreground">No subjects found</p>
          <p className="text-sm text-muted-foreground mt-1">Click "+ Add Subject" above to create your first subject.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => {
            const chapters = chaptersMap[subject.id] || [];
            const isLoadingChapters = loadingChaptersMap[subject.id];

            return (
              <div key={subject.id} className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
                {/* Subject Header */}
                <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{subject.name}</h2>
                    <p className="text-xs text-muted-foreground">{chapters.length} Chapters defined</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSubjectForChapter(subject);
                      setChapterError(null);
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
                  >
                    + Add Chapter
                  </button>
                </div>

                {/* Chapters List */}
                <div className="p-6">
                  {isLoadingChapters ? (
                    <p className="text-xs text-muted-foreground italic">Loading chapters...</p>
                  ) : chapters.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No chapters created for this subject yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {chapters.map((ch, index) => (
                        <div
                          key={ch.id}
                          className="flex items-center gap-x-2.5 p-3 rounded-xl border border-border bg-surface-hover/40"
                        >
                          <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground truncate" title={ch.name}>
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
      )}

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Add New Subject</h3>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            {subjectError && (
              <div className="p-3 bg-red-50 text-xs text-red-600 rounded-lg border border-red-200">
                {subjectError}
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-foreground mb-1">Subject Name</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Physics, Higher Mathematics"
                  className="w-full rounded-lg border border-border bg-surface text-foreground px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-xs font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingSubject ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Chapter Modal */}
      {activeSubjectForChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Add Chapter</h3>
                <p className="text-xs text-muted-foreground">Subject: {activeSubjectForChapter.name}</p>
              </div>
              <button
                onClick={() => setActiveSubjectForChapter(null)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            {chapterError && (
              <div className="p-3 bg-red-50 text-xs text-red-600 rounded-lg border border-red-200">
                {chapterError}
              </div>
            )}

            <form onSubmit={handleCreateChapter} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-foreground mb-1">Chapter Name</label>
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="e.g. Chapter 1: Thermodynamics"
                  className="w-full rounded-lg border border-border bg-surface text-foreground px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveSubjectForChapter(null)}
                  className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground text-xs font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingChapter ? 'Adding...' : 'Add Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
