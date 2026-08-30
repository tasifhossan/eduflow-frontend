'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch, apiGet } from '@/lib/api';

interface GuardianLogEntry {
  id: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedAt: string;
  changedBy: {
    id: string;
    name: string;
  };
}

interface StudentEditControlsProps {
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    linkedGuardians?: any[];
  };
  isAdmin: boolean;
}

export default function StudentEditControls({ student, isAdmin }: StudentEditControlsProps) {
  const router = useRouter();
  const hasLinkedGuardian = (student.linkedGuardians && student.linkedGuardians.length > 0) || false;

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone || '');
  const [guardianName, setGuardianName] = useState(student.guardianName || '');
  const [guardianPhone, setGuardianPhone] = useState(student.guardianPhone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // History Drawer/Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logs, setLogs] = useState<GuardianLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    setName(student.name);
    setPhone(student.phone || '');
    setGuardianName(student.guardianName || '');
    setGuardianPhone(student.guardianPhone || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setEditError('Student name is required');
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      const response = await apiPatch(`/api/students/${student.id}`, {
        name: name.trim(),
        phone: phone.trim() || null,
        guardianName: guardianName.trim() || null,
        guardianPhone: guardianPhone.trim() || null,
      });

      if (response && response.success) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        setEditError(response.message || 'Failed to update student profile');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setLoadingLogs(true);
    setHistoryError(null);

    try {
      const response = await apiGet<{ success: boolean; data: GuardianLogEntry[] }>(
        `/api/students/${student.id}/guardian-log`
      );

      if (response && response.success && response.data) {
        setLogs(response.data);
      } else {
        setHistoryError('Failed to load guardian change logs');
      }
    } catch (err: any) {
      setHistoryError(err.message || 'Error fetching change history');
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <>
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={handleOpenEdit}
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 transition"
          >
            ✏️ Edit Profile
          </button>
          <button
            onClick={handleOpenHistory}
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            📜 View Guardian Change History
          </button>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Edit Student Profile</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 text-xs text-red-600 rounded-lg border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Student Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Guardian Name</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Mr. Hossain"
                  disabled={hasLinkedGuardian}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Guardian Phone</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="e.g. 01711111111"
                  disabled={hasLinkedGuardian}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-accent focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                {hasLinkedGuardian && (
                  <p className="text-[11px] text-amber-600 mt-1 italic font-medium">
                    Synced from linked guardian account — unlink to edit manually
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guardian History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Guardian Info Change History</h3>
                <p className="text-xs text-gray-500">Audit trail of changes to guardian name and phone</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading audit history...</div>
            ) : historyError ? (
              <div className="p-4 bg-red-50 text-xs text-red-600 rounded-lg">{historyError}</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 italic">
                No guardian info changes recorded for this student.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="pt-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 uppercase tracking-wider">
                        {log.field === 'guardianName' ? 'Guardian Name' : 'Guardian Phone'}
                      </span>
                      <span className="text-gray-400 font-mono">
                        {new Date(log.changedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-x-2 text-gray-700 bg-gray-50 p-2 rounded-lg">
                      <span className="text-red-600 line-through font-medium">
                        {log.oldValue || '<Empty>'}
                      </span>
                      <span>→</span>
                      <span className="text-green-700 font-bold">
                        {log.newValue || '<Empty>'}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      Changed by Admin: <span className="font-semibold text-gray-800">{log.changedBy?.name || 'Admin'}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 text-right">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
