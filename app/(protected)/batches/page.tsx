import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';

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
}

export default async function BatchesPage() {
  const user = await getCurrentUser();

  // Enforce ADMIN or TEACHER role access only
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    redirect('/dashboard');
  }

  let batches: Batch[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await apiGet<{ success: boolean; data: Batch[] }>('/api/batches', {
      headers: {
        Cookie: cookieHeader,
      },
      next: { revalidate: 0 },
    });

    if (response && response.success) {
      batches = response.data;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load batches';
  }

  const isAdmin = user.role === 'ADMIN';

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

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        {/* Batches Table Card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          {batches.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-foreground">No batches found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new batch definition.</p>
              {isAdmin && (
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
                    <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/batches/${batch.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                          {batch.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          batch.type === 'ACADEMIC'
                            ? 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-400/20'
                            : 'bg-amber-50 text-amber-700 ring-amber-700/10 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-400/20'
                        }`}>
                          {batch.type}
                        </span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/batches/${batch.id}`} className="text-primary hover:text-primary-hover font-medium">
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
