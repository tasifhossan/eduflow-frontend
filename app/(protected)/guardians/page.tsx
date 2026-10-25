'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Plus,
  Link as LinkIcon,
  X,
  Loader2,
  Mail,
  Phone,
  Shield,
  CheckCircle,
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  guardianLinks?: {
    student: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

export default function AdminGuardiansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guardians, setGuardians] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form toggles
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Link form state
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
    init();

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const [gRes, sRes] = await Promise.all([
          apiGet<{ success: boolean; data: UserItem[] }>('/api/users?role=GUARDIAN'),
          apiGet<{ success: boolean; data: UserItem[] }>('/api/users?role=STUDENT'),
        ]);

        if (gRes.success && gRes.data) setGuardians(gRes.data);
        if (sRes.success && sRes.data) setStudents(sRes.data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load guardians and students');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleCreateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await apiPost('/api/guardians', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      if (res.success && res.data) {
        setCreateSuccess('Guardian account created successfully!');
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setIsCreateOpen(false);

        // Refresh guardian list
        const gRes = await apiGet<{ success: boolean; data: UserItem[] }>('/api/users?role=GUARDIAN');
        if (gRes.success && gRes.data) setGuardians(gRes.data);
      } else {
        setCreateError(res.message || 'Failed to create guardian account');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error creating guardian account');
    } finally {
      setCreating(false);
    }
  };

  const handleLinkGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardianId || !selectedStudentId) {
      setLinkError('Please select both a guardian and a student');
      return;
    }

    setLinking(true);
    setLinkError(null);
    setLinkSuccess(null);

    try {
      const res = await apiPost('/api/guardians/link', {
        guardianId: selectedGuardianId,
        studentId: selectedStudentId,
      });

      if (res.success) {
        setLinkSuccess('Guardian successfully linked to student!');
        setSelectedGuardianId('');
        setSelectedStudentId('');
        setIsLinkOpen(false);

        // Refresh guardian list to show updated linked students
        const gRes = await apiGet<{ success: boolean; data: UserItem[] }>('/api/users?role=GUARDIAN');
        if (gRes.success && gRes.data) setGuardians(gRes.data);
      } else {
        setLinkError(res.message || 'Failed to link guardian to student');
      }
    } catch (err: any) {
      setLinkError(err.message || 'Error linking guardian to student');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading guardian accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Guardian Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage parent/guardian accounts and link them to students
            </p>
          </div>
          <div className="flex items-center gap-x-3 shrink-0">
            <button
              onClick={() => {
                setIsLinkOpen(!isLinkOpen);
                if (isCreateOpen) setIsCreateOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-hover transition gap-x-2"
            >
              <LinkIcon className="w-4 h-4 text-primary" /> Link to Student
            </button>
            <button
              onClick={() => {
                setIsCreateOpen(!isCreateOpen);
                if (isLinkOpen) setIsLinkOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition gap-x-2"
            >
              <Plus className="w-4 h-4" /> Create Guardian
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {createSuccess && (
          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" /> {createSuccess}
          </div>
        )}
        {linkSuccess && (
          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" /> {linkSuccess}
          </div>
        )}

        {/* Create Guardian Modal/Card */}
        {isCreateOpen && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-x-2">
                <Plus className="w-5 h-5 text-primary" /> Create Guardian Account
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGuardian} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Rafiqul Islam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rafiqul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-x-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Link Guardian to Student Form */}
        {isLinkOpen && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-x-2">
                <LinkIcon className="w-5 h-5 text-primary" /> Link Guardian to Student
              </h2>
              <button onClick={() => setIsLinkOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {linkError && (
              <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkGuardian} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Select Guardian <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedGuardianId}
                  onChange={(e) => {
                    setSelectedGuardianId(e.target.value);
                    setSelectedStudentId('');
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-surface text-foreground"
                >
                  <option value="">-- Choose Guardian Account --</option>
                  {guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const linkedStudentIds = selectedGuardianId
                    ? guardians
                        .find((g) => g.id === selectedGuardianId)
                        ?.guardianLinks?.map((link) => link.student.id) || []
                    : [];
                  const availableStudents = students.filter((s) => !linkedStudentIds.includes(s.id));

                  return (
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-surface text-foreground"
                    >
                      <option value="">-- Choose Student --</option>
                      {availableStudents.length === 0 && selectedGuardianId ? (
                        <option value="" disabled>All students already linked to this guardian</option>
                      ) : (
                        availableStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))
                      )}
                    </select>
                  );
                })()}
              </div>

              <div className="sm:col-span-2 flex justify-end gap-x-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLinkOpen(false)}
                  disabled={linking}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition"
                >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Link
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Guardians List */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-x-2">
              <UserCheck className="w-4 h-4 text-primary" /> Registered Guardians ({guardians.length})
            </h2>
          </div>

          {guardians.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-semibold text-foreground">No guardian accounts found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Click "Create Guardian" above to register a parent or guardian account.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {guardians.map((g) => (
                <div key={g.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-hover/20 transition-colors">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-bold text-foreground text-base">{g.name}</h3>
                      <div className="flex items-center gap-x-4 text-xs text-muted-foreground flex-wrap mt-0.5">
                        <span className="flex items-center gap-x-1">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {g.email}
                        </span>
                        {g.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-x-1">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {g.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Linked Students List */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                      <span className="text-muted-foreground font-medium">Linked Students:</span>
                      {g.guardianLinks && g.guardianLinks.length > 0 ? (
                        g.guardianLinks.map((link) => (
                          <span
                            key={link.student.id}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20"
                          >
                            {link.student.name} ({link.student.email})
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">No linked students yet</span>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20 shrink-0 self-start sm:self-center">
                    GUARDIAN ACCOUNT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
