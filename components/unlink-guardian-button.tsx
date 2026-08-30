'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/api';

interface UnlinkGuardianButtonProps {
  linkId: string;
  guardianName: string;
}

export default function UnlinkGuardianButton({ linkId, guardianName }: UnlinkGuardianButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUnlink = async () => {
    if (!confirm(`Are you sure you want to unlink ${guardianName}'s account from this student?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiDelete(`/api/guardians/link/${linkId}`);
      if (res && res.success) {
        router.refresh();
      } else {
        alert(res?.message || 'Failed to unlink guardian account');
      }
    } catch (err: any) {
      alert(err.message || 'Error unlinking guardian account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUnlink}
      disabled={loading}
      type="button"
      className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 transition ml-2"
    >
      {loading ? 'Unlinking...' : 'Unlink'}
    </button>
  );
}
