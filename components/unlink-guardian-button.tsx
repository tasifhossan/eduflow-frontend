'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/api';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface UnlinkGuardianButtonProps {
  linkId: string;
  guardianName: string;
}

export default function UnlinkGuardianButton({ linkId, guardianName }: UnlinkGuardianButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmUnlink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiDelete(`/api/guardians/link/${linkId}`);
      if (res && res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res?.message || 'Failed to unlink guardian account');
      }
    } catch (err: any) {
      setError(err.message || 'Error unlinking guardian account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline transition ml-2 cursor-pointer"
      >
        Unlink
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4 border border-gray-100 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-x-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Unlink Guardian</h3>
                <p className="text-xs text-gray-500">Confirm account unlinking</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to unlink <span className="font-bold text-gray-900">{guardianName}</span>&apos;s account from this student? The guardian will lose portal access to this student&apos;s records.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-3.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={loading}
                className="inline-flex items-center gap-x-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition shadow-xs"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Unlinking...' : 'Unlink Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
