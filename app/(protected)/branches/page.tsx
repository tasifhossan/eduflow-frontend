'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
}

export default function BranchesManagementPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiGet<{ success: boolean; data: Branch[] }>('/api/branches');
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
        } else {
          setErrorMsg('Failed to load branches.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load branches.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormName('');
    setFormAddress('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormName(branch.name);
    setFormAddress(branch.address || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Branch name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingBranch) {
        // Edit Branch -> use PUT consistently
        const res = await apiPut<{ success: boolean; data: Branch }>(
          `/api/branches/${editingBranch.id}`,
          { name: formName.trim(), address: formAddress.trim() || undefined }
        );

        if (res.success && res.data) {
          setBranches((prev) =>
            prev.map((b) => (b.id === editingBranch.id ? res.data : b))
          );
          closeModal();
        } else {
          setFormError('Failed to update branch.');
        }
      } else {
        // Create Branch
        const res = await apiPost<{ success: boolean; data: Branch }>(
          '/api/branches',
          { name: formName.trim(), address: formAddress.trim() || undefined }
        );

        if (res.success && res.data) {
          setBranches((prev) => [res.data, ...prev]);
          closeModal();
        } else {
          setFormError('Failed to create branch.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      setDeletingId(id);
      const res = await apiDelete<{ success: boolean }>(`/api/branches/${id}`);
      if (res.success) {
        setBranches((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert('Failed to delete branch.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete branch.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="ml-3 text-lg text-gray-500 font-medium">Loading branches...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800">Error Loading Branches</h3>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
        </div>
        <Link href="/dashboard" className="text-accent hover:underline text-sm font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
        <div>
          <nav className="flex text-sm text-gray-500 gap-x-2 mb-1">
            <Link href="/super-admin" className="hover:text-accent font-medium">Super Admin</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Branches</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Branch Management</h1>
          <p className="mt-1 text-sm text-gray-500">Create, modify, and delete organization branches</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 transition"
        >
          + Add New Branch
        </button>
      </div>

      {/* Branches List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {branches.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-12 text-center">
            No branches found. Click "+ Add New Branch" to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Branch Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created Date</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{b.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{b.address || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(b.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => openEditModal(b)}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                      >
                        {deletingId === b.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit Branch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingBranch ? 'Edit Branch' : 'Create New Branch'}
              </h3>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Uttara Branch"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Sector 4, Uttara, Dhaka"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-accent text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition"
                >
                  {isSubmitting
                    ? editingBranch
                      ? 'Saving...'
                      : 'Creating...'
                    : editingBranch
                    ? 'Save Changes'
                    : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
