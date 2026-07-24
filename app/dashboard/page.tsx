import React from 'react';
import { cookies } from 'next/headers';
import { apiGet } from '@/lib/api';

interface DbStatusResponse {
  status: string;
  branchCount?: number;
  message?: string;
}

export default async function DashboardPage() {
  let dbStatus: DbStatusResponse | null = null;
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    dbStatus = await apiGet<DbStatusResponse>('/api/health/db', {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });
  } catch (err: any) {
    errorMsg = err.message || 'Failed to connect to backend/database';
  }

  const isConnected = !errorMsg && dbStatus && dbStatus.status === 'ok';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-500">EduFlow Deployment Chain Verification</p>
          </div>
        </div>

        {/* Verification Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Connection Check</h2>

          {isConnected ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-x-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                Connection OK
              </div>
              <p className="text-gray-700">
                The connection from Vercel frontend to the Render backend and Supabase DB is working end-to-end!
              </p>
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm font-mono text-gray-600">
                  <span className="font-semibold text-gray-800">Branch Count in DB:</span> {dbStatus?.branchCount}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-x-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                Connection Failed
              </div>
              <p className="text-gray-700">
                There was a problem reaching the database. Check the backend logs or DB configurations.
              </p>
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-mono text-red-600">
                  <span className="font-semibold text-red-800">Error Details:</span> {errorMsg || dbStatus?.message || 'Unknown database error'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
