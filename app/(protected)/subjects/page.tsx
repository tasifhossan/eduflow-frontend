'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';

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
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const payload = parseJwt(token);
    if (!payload || payload.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadSubjects();
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading subjects...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-3">
        <div>
          <nav className="flex text-sm text-gray-500 gap-x-2 mb-1">
            <Link href="/dashboard" className="hover:text-accent font-medium">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Subjects</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Subject & Chapter Management</h1>
          <p className="mt-1 text-sm text-gray-500">Organize academic curriculum subjects and chapter topics</p>
        </div>

        <button
          onClick={() => {
            setSubjectError(null);
            setIsAddSubjectOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 transition"
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
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No subjects found</p>
          <p className="text-sm text-gray-500 mt-1">Click "+ Add Subject" above to create your first subject.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => {
            const chapters = chaptersMap[subject.id] || [];
            const isLoadingChapters = loadingChaptersMap[subject.id];

            return (
              <div key={subject.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Subject Header */}
                <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{subject.name}</h2>
                    <p className="text-xs text-gray-500">{chapters.length} Chapters defined</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSubjectForChapter(subject);
                      setChapterError(null);
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    + Add Chapter
                  </button>
                </div>

                {/* Chapters List */}
                <div className="p-6">
                  {isLoadingChapters ? (
                    <p className="text-xs text-gray-400 italic">Loading chapters...</p>
                  ) : chapters.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No chapters created for this subject yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {chapters.map((ch, index) => (
                        <div
                          key={ch.id}
                          className="flex items-center gap-x-2.5 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                        >
                          <span className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 truncate" title={ch.name}>
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
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Subject</h3>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
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
                <label className="block font-semibold text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Physics, Higher Mathematics"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50"
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
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Chapter</h3>
                <p className="text-xs text-gray-500">Subject: {activeSubjectForChapter.name}</p>
              </div>
              <button
                onClick={() => setActiveSubjectForChapter(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
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
                <label className="block font-semibold text-gray-700 mb-1">Chapter Name</label>
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="e.g. Chapter 1: Thermodynamics"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSubjectForChapter(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50"
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
