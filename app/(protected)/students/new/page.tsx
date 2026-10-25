'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    name: string;
    identifier: string;
    studentCode?: string | null;
    temporaryPassword?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Student name is required');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setErrorMsg('Please provide at least a student phone number or email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        role: 'STUDENT',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
      };

      const response = await apiPost<{
        success: boolean;
        message: string;
        data: {
          user: { name: string; studentCode?: string | null };
          temporaryPassword?: string;
          identifier: string;
        };
      }>('/api/auth/register', payload);

      if (response && response.success && response.data) {
        setCreatedCreds({
          name: response.data.user.name,
          identifier: response.data.identifier,
          studentCode: response.data.user.studentCode,
          temporaryPassword: response.data.temporaryPassword,
        });
      } else {
        setErrorMsg(response.message || 'Failed to provision student account');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-500 gap-x-2">
          <Link href="/students" className="hover:text-primary font-medium">Students</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">New Student</span>
        </nav>

        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Provision Student</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create an official student account. A unique student ID and secure temporary password will be generated automatically.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600">
              <span className="font-semibold text-red-800">Error:</span> {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Student Name */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Rahman"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
                Student Phone Number
              </label>
              <input
                type="text"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                Student Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. tanvir@example.com"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guardian Information
              </span>
            </div>

            {/* Guardian Name */}
            <div>
              <label htmlFor="guardianName" className="block text-sm font-semibold text-foreground mb-2">
                Guardian Name (Optional)
              </label>
              <input
                type="text"
                id="guardianName"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Rafiqul Islam"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            {/* Guardian Phone */}
            <div>
              <label htmlFor="guardianPhone" className="block text-sm font-semibold text-foreground mb-2">
                Guardian Phone (Optional)
              </label>
              <input
                type="text"
                id="guardianPhone"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="e.g. 01812345678"
                className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-4 border-t border-border pt-6">
            <Link
              href="/students"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Student'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal: Credential Reveal */}
      <Modal
        isOpen={Boolean(createdCreds)}
        onClose={() => router.push('/students')}
        title="Student Account Provisioned"
        description="Credentials generated for new student account. Please copy them now."
        maxWidth="md"
      >
        {createdCreds && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-surface-hover/40 p-4 space-y-3">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Student Name</span>
                <p className="text-sm font-bold text-foreground">{createdCreds.name}</p>
              </div>

              {createdCreds.studentCode && (
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Student ID</span>
                  <p className="font-mono text-base font-bold text-primary">{createdCreds.studentCode}</p>
                </div>
              )}

              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Login Identifier</span>
                <p className="font-mono text-sm font-semibold text-foreground">{createdCreds.identifier}</p>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Temporary Password</span>
                <div className="flex items-center justify-between gap-2 bg-surface p-2.5 rounded border border-border mt-1">
                  <span className="font-mono text-sm font-bold tracking-wider text-red-500">
                    {createdCreds.temporaryPassword}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      if (createdCreds.temporaryPassword) {
                        navigator.clipboard.writeText(createdCreds.temporaryPassword);
                        toast.success('Password copied to clipboard');
                      }
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push('/students')}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
