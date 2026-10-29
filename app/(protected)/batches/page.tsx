'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserClient } from '@/lib/client-auth';
import { apiGet, apiDelete, apiPost } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface Batch {
  id: string;
  name: string;
  type: 'ACADEMIC' | 'ADMISSION';
  classLevel?: string | null;
  subject: {
    name: string;
  };
  teacher?: {
    name: string;
  } | null;
  _count?: {
    enrollments: number;
  };
  archivedAt?: string | null;
}

export default function BatchesPage() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [archivedBatches, setArchivedBatches] = useState<Batch[]>([]);
  const [activeFilter, setActiveFilter] = useState<'active' | 'archived'>('active');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Archive modal state
  const [batchToArchive, setBatchToArchive] = useState<Batch | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await apiGet<{ success: boolean; data: Batch[] }>('/api/batches');
      if (response && response.success) {
        setBatches(response.data);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        router.push('/dashboard');
        return;
      }
      setUserRole(user.role);
      fetchBatches();
    }

    init();
  }, [router, fetchBatches]);

  const handleArchiveConfirm = async () => {
    if (!batchToArchive || isArchiving) return;

    setIsArchiving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiDelete<{ success: boolean; message?: string; data?: { archived?: boolean } }>(
        `/api/batches/${batchToArchive.id}`
      );

      if (res.success) {
        setSuccessMsg(`Batch "${batchToArchive.name}" has been archived. Enrolled student records and fees remain intact.`);
        setArchivedBatches((prev) => [...prev, { ...batchToArchive, archivedAt: new Date().toISOString() }]);
        setBatches((prev) => prev.filter((b) => b.id !== batchToArchive.id));
        setBatchToArchive(null);
      } else {
        setErrorMsg(res.message || 'Failed to archive batch');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred while archiving the batch');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreBatch = async (batchId: string) => {
    setIsRestoring(batchId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiPost<{ success: boolean; message?: string }>(`/api/batches/${batchId}/restore`, {});

      if (res.success) {
        setSuccessMsg('Batch restored successfully!');
        const restored = archivedBatches.find((b) => b.id === batchId);
        if (restored) {
          setArchivedBatches((prev) => prev.filter((b) => b.id !== batchId));
          setBatches((prev) => [...prev, { ...restored, archivedAt: null }]);
        }
        await fetchBatches();
      } else {
        setErrorMsg(res.message || 'Failed to restore batch');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'An error occurred while restoring the batch');
    } finally {
      setIsRestoring(null);
    }
  };

  const isAdmin = userRole === 'ADMIN';
  const displayedBatches = activeFilter === 'active' ? batches : archivedBatches;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-lg text-muted-foreground font-medium">Loading batches...</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Batches</h1>
            <p className="mt-2 text-sm text-muted-foreground">View and manage coaching classes and cohorts</p>
          </div>
          {isAdmin && (
            <Link
              href="/batches/new"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition"
            >
              Create Batch
            </Link>
          )}
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-success-bg p-4 border border-status-success-border">
            <p className="text-sm text-status-success-text font-medium">✓ {successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-[var(--radius-card)] bg-status-danger-bg p-4 border border-status-danger-border">
            <p className="text-sm text-status-danger-text font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Admin Filter Tabs (Active vs Archived) */}
        {isAdmin && (
          <div className="flex border-b border-border gap-x-2">
            <button
              onClick={() => setActiveFilter('active')}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-x-1.5 ${activeFilter === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Active Batches
              <Badge variant="neutral" size="sm">
                {batches.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-x-1.5 ${activeFilter === 'archived'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Archived Batches
              {archivedBatches.length > 0 && (
                <Badge variant="warning" size="sm">
                  {archivedBatches.length}
                </Badge>
              )}
            </button>
          </div>
        )}

        {/* Batches Table Card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {displayedBatches.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-sm font-semibold text-foreground">
                {activeFilter === 'active' ? 'No active batches found' : 'No archived batches found'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFilter === 'active'
                  ? 'Get started by creating a new batch definition.'
                  : 'No batches have been archived.'}
              </p>
              {isAdmin && activeFilter === 'active' && (
                <div className="mt-6">
                  <Link
                    href="/batches/new"
                    className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
                  >
                    Add Batch
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-hover/50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Level</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teacher</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Students</th>
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {displayedBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeFilter === 'active' ? (
                          <Link href={`/batches/${batch.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                            {batch.name}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {batch.name} (Archived)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={batch.type === 'ACADEMIC' ? 'primary' : 'accent'}
                          size="sm"
                        >
                          {batch.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {batch.classLevel || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                        {batch.subject?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {batch.teacher?.name || <span className="text-muted-foreground/60 italic">Unassigned</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <span className="font-semibold">{batch._count?.enrollments || 0}</span> students
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-3">
                        {activeFilter === 'active' ? (
                          <>
                            <Link href={`/batches/${batch.id}`} className="text-primary hover:text-primary-hover font-medium">
                              View details
                            </Link>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setBatchToArchive(batch)}
                                className="text-status-danger-text hover:opacity-80 font-medium"
                              >
                                Archive
                              </button>
                            )}
                          </>
                        ) : (
                          isAdmin && (
                            <button
                              type="button"
                              disabled={isRestoring === batch.id}
                              onClick={() => handleRestoreBatch(batch.id)}
                              className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
                            >
                              {isRestoring === batch.id ? 'Restoring...' : 'Restore'}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Batch Archive Modal */}
      {batchToArchive && (
        <Modal
          isOpen={true}
          onClose={() => setBatchToArchive(null)}
          title={`Archive Batch "${batchToArchive.name}"`}
          description="Soft-archive this batch. Enrolled students and payment records are preserved."
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Are you sure you want to archive this batch cohort?
            </p>
            <div className="rounded-[var(--radius-card)] bg-surface-hover/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p>• <strong>Historical safety:</strong> All student enrollments, exam results, attendance logs, and fee payments remain intact.</p>
              <p>• <strong>Visibility:</strong> Archived batches will not accept new enrollments and disappear from active student portals.</p>
              <p>• <strong>Restoration:</strong> Administrators can restore this batch at any time from the &ldquo;Archived Batches&rdquo; tab.</p>
            </div>
            <div className="flex justify-end gap-x-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setBatchToArchive(null)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleArchiveConfirm}
                className="rounded-lg bg-status-danger-bg border border-status-danger-border px-4 py-2 text-xs font-semibold text-status-danger-text hover:opacity-80 disabled:opacity-50 transition"
              >
                {isArchiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
