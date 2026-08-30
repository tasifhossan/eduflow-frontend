'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';
import {
  FileText,
  FileImage,
  FileVideo,
  File,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  batchId: string;
  chapterId?: string | null;
  chapter?: {
    id: string;
    name: string;
  } | null;
  uploadedBy?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface Chapter {
  id: string;
  name: string;
}

interface BatchDetails {
  id: string;
  name: string;
  subject: {
    id: string;
    name: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BatchResourcesPage({ params }: PageProps) {
  const { id: batchId } = use(params);

  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.role) {
        setUserRole(payload.role);
      }
    }

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch batch details
        const batchRes = await apiGet<{ success: boolean; data: BatchDetails }>(`/api/batches/${batchId}`);
        if (batchRes.success && batchRes.data) {
          setBatch(batchRes.data);

          // Fetch chapters for this batch's subject
          if (batchRes.data.subject?.id) {
            const chapRes = await apiGet<{ success: boolean; data: Chapter[] }>(
              `/api/chapters?subjectId=${batchRes.data.subject.id}`
            ).catch(() => ({ success: false, data: [] }));
            if (chapRes.success && chapRes.data) {
              setChapters(chapRes.data);
            }
          }
        }

        // Fetch resources
        const resData = await apiGet<{ success: boolean; data: Resource[] }>(`/api/batches/${batchId}/resources`);
        if (resData.success && resData.data) {
          setResources(resData.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load study materials');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [batchId]);

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <FileImage className="w-6 h-6 text-blue-500" />;
    }
    if (type.includes('video') || type.includes('mp4')) {
      return <FileVideo className="w-6 h-6 text-purple-500" />;
    }
    return <File className="w-6 h-6 text-indigo-500" />;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setUploadError('Please provide a material title');
      return;
    }
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Fetch Cloudinary upload signature
      const sigRes = await apiGet<{
        success: boolean;
        data: {
          signature: string;
          timestamp: number;
          cloudName: string;
          apiKey: string;
          folder: string;
        };
      }>('/api/uploads/signature');

      if (!sigRes.success || !sigRes.data) {
        throw new Error('Failed to obtain upload authorization credentials');
      }

      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

      // 2. Prepare FormData for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      // 3. Upload directly from browser to Cloudinary API
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        const cErr = await cloudinaryResponse.json().catch(() => ({}));
        throw new Error(cErr.error?.message || 'Cloudinary file upload failed');
      }

      const cData = await cloudinaryResponse.json();
      const secureUrl = cData.secure_url;

      // Determine clean file type
      let detectedType = file.type || 'file';
      if (file.name.toLowerCase().endsWith('.pdf')) detectedType = 'pdf';
      else if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type.startsWith('video/')) detectedType = 'video';

      // 4. Create resource record in backend
      const saveRes = await apiPost('/api/resources', {
        title: title.trim(),
        fileUrl: secureUrl,
        fileType: detectedType,
        batchId,
        chapterId: selectedChapterId || undefined,
      });

      if (saveRes.success) {
        // Reset form & reload list
        setTitle('');
        setSelectedChapterId('');
        setFile(null);
        setIsUploadOpen(false);

        const updatedList = await apiGet<{ success: boolean; data: Resource[] }>(
          `/api/batches/${batchId}/resources`
        );
        if (updatedList.success && updatedList.data) {
          setResources(updatedList.data);
        }
      } else {
        setUploadError(saveRes.message || 'Failed to save resource details');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'An error occurred during file upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;

    setDeletingId(id);
    try {
      const res = await apiDelete(`/api/resources/${id}`);
      if (res.success) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.message || 'Failed to delete resource');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting resource');
    } finally {
      setDeletingId(null);
    }
  };

  const canManage = userRole === 'ADMIN' || userRole === 'TEACHER';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/batches" className="hover:text-accent font-medium">Batches</Link>
          <span>/</span>
          <Link href={`/batches/${batchId}`} className="hover:text-accent font-medium">{batch?.name || 'Batch'}</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Study Materials</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Study Materials
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {batch ? `Resources & lecture notes for ${batch.name}` : 'Batch study materials and lecture notes'}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition gap-x-2"
            >
              {isUploadOpen ? (
                <>
                  <X className="w-4 h-4" /> Cancel
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload Material
                </>
              )}
            </button>
          )}
        </div>

        {/* Error message if initial fetch failed */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Upload Form Modal/Card (Admin & Teacher only) */}
        {canManage && isUploadOpen && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-x-2">
                <Plus className="w-5 h-5 text-accent" /> Upload New Study Material
              </h2>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 3 - Organic Chemistry Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Chapter Tag (Optional)
                  </label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                  >
                    <option value="">-- No Specific Chapter --</option>
                    {chapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>
                        {chap.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-accent hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Uploading to Cloudinary...
                    </>
                  ) : (
                    'Upload & Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resources List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-x-2">
              <BookOpen className="w-4 h-4 text-accent" /> Available Resources ({resources.length})
            </h2>
          </div>

          {resources.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <File className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No study materials found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {canManage
                  ? 'No study materials have been uploaded for this batch yet. Click "Upload Material" to share notes.'
                  : 'Your teachers have not uploaded study materials for this batch yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition"
                >
                  <div className="flex items-start gap-x-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shrink-0 mt-0.5">
                      {getFileIcon(res.fileType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-x-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-base">{res.title}</h3>
                        {res.chapter && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {res.chapter.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-4 text-xs text-gray-500 flex-wrap">
                        <span>Type: <strong className="uppercase font-medium text-gray-700">{res.fileType}</strong></span>
                        <span>•</span>
                        <span>Uploaded: {new Date(res.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        {res.uploadedBy && (
                          <>
                            <span>•</span>
                            <span>By: {res.uploadedBy.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-3 shrink-0 self-end sm:self-center">
                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-accent transition gap-x-1.5"
                    >
                      <span>View / Download</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {canManage && (
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        disabled={deletingId === res.id}
                        className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                        title="Delete resource"
                      >
                        {deletingId === res.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
