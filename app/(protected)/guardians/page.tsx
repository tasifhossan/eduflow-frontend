'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, parseJwt } from '@/lib/client-auth';
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
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

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
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
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
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition gap-x-2"
            >
              <LinkIcon className="w-4 h-4 text-accent" /> Link to Student
            </button>
            <button
              onClick={() => {
                setIsCreateOpen(!isCreateOpen);
                if (isLinkOpen) setIsLinkOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition gap-x-2"
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-x-2">
                <Plus className="w-5 h-5 text-accent" /> Create Guardian Account
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGuardian} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Rafiqul Islam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rafiqul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-x-2">
                <LinkIcon className="w-5 h-5 text-accent" /> Link Guardian to Student
              </h2>
              <button onClick={() => setIsLinkOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {linkError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-700">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkGuardian} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Guardian <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedGuardianId}
                  onChange={(e) => setSelectedGuardianId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-white"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkOpen(false)}
                  disabled={linking}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Link
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Guardians List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-x-2">
              <UserCheck className="w-4 h-4 text-accent" /> Registered Guardians ({guardians.length})
            </h2>
          </div>

          {guardians.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Shield className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="text-base font-semibold text-gray-900">No guardian accounts found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Click "Create Guardian" above to register a parent or guardian account.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {guardians.map((g) => (
                <div key={g.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 text-base">{g.name}</h3>
                    <div className="flex items-center gap-x-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-x-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> {g.email}
                      </span>
                      {g.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-x-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {g.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10 shrink-0 self-start sm:self-center">
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
