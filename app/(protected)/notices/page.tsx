'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';
import {
  Bell,
  Plus,
  X,
  Trash2,
  Loader2,
  Megaphone,
  Calendar,
  UserCheck,
  Building2,
  Users,
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

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.role) {
        setUserRole(payload.role);
      }
    }

    async function loadNotices() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch notices feed
        const res = await apiGet<{ success: boolean; data: Notice[] }>('/api/notices');
        if (res.success && res.data) {
          setNotices(res.data);
        }

        // If ADMIN or TEACHER, fetch batches for the post notice dropdown
        const role = parseJwt(token || '')?.role;
        if (role === 'ADMIN' || role === 'TEACHER') {
          const batchRes = await apiGet<{ success: boolean; data: BatchOption[] }>('/api/batches')
            .catch(() => ({ success: false, data: [] }));
          if (batchRes.success && batchRes.data) {
            setBatches(batchRes.data);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load notice board');
      } finally {
        setLoading(false);
      }
    }

    loadNotices();
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
        const refreshRes = await apiGet<{ success: boolean; data: Notice[] }>('/api/notices');
        if (refreshRes.success && refreshRes.data) {
          setNotices(refreshRes.data);
        }
      } else {
        setFormError(res.message || 'Failed to post notice');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while posting notice');
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
    } catch (err: any) {
      alert(err.message || 'Error deleting notice');
    } finally {
      setDeletingId(null);
    }
  };

  const canPost = userRole === 'ADMIN' || userRole === 'TEACHER';
  const canDelete = userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading notice board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <div className="flex items-center gap-x-3">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Notice Board
                </h1>
                <p className="text-sm text-gray-500">
                  Official announcements, batch updates, and branch notices
                </p>
              </div>
            </div>
          </div>

          {canPost && (
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition gap-x-2 shrink-0"
            >
              {isFormOpen ? (
                <>
                  <X className="w-4 h-4" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Post Notice
                </>
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Post Notice Form (ADMIN & TEACHER) */}
        {canPost && isFormOpen && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-x-2">
                <Bell className="w-5 h-5 text-accent" /> Create Announcement
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notice Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exam Schedule Update / Holiday Notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Target Audience <span className="text-gray-400 font-normal">(Batch Scope)</span>
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                >
                  <option value="">-- All Batches (Branch-Wide Notice) --</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      Batch: {batch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the full announcement details here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={posting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {posting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Posting...
                    </>
                  ) : (
                    'Publish Notice'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notices Feed */}
        {notices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-accent">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No notices published yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Check back later for official announcements and updates from your branch.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-x-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900">{notice.title}</h2>
                      {notice.batch ? (
                        <span className="inline-flex items-center gap-x-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          <Users className="w-3 h-3" /> {notice.batch.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-x-1 rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10">
                          <Building2 className="w-3 h-3" /> Branch-wide
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-x-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-x-1">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        {notice.createdBy.name} ({notice.createdBy.role})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-x-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(notice.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      disabled={deletingId === notice.id}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition shrink-0"
                      title="Delete notice"
                    >
                      {deletingId === notice.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed border-t border-gray-100 pt-3">
                  {notice.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
