'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  UserPlus,
  Upload,
  RefreshCw,
  Search,
  KeyRound,
  UserCheck,
  UserX,
  Copy,
  Download,
  CheckCircle,
  Phone,
  Mail,
  Users as UsersIcon,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  studentCode?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface BranchItem {
  id: string;
  name: string;
  code?: string | null;
}

interface UsersManagementProps {
  currentUserRole: string;
  currentUserBranchId?: string;
}

interface BulkRowParsed {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  batchName?: string;
  guardianName?: string;
  guardianPhone?: string;
  isValid: boolean;
  validationError?: string;
}

interface ImportResultItem {
  row: number;
  name: string;
  role: string;
  status: 'CREATED' | 'SKIPPED';
  reason?: string;
  identifier?: string;
  studentCode?: string | null;
  temporaryPassword?: string;
}

export default function UsersManagementClient({
  currentUserRole,
  currentUserBranchId,
}: UsersManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    role: 'STUDENT',
    phone: '',
    email: '',
    branchId: currentUserBranchId || '',
    guardianName: '',
    guardianPhone: '',
  });

  // Credential reveal modal
  const [createdCreds, setCreatedCreds] = useState<{
    name: string;
    role: string;
    identifier: string;
    studentCode?: string | null;
    temporaryPassword?: string;
  } | null>(null);

  // Admin password reset modal
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [issuedTempPass, setIssuedTempPass] = useState<string | null>(null);

  // Status toggle confirmation
  const [statusTarget, setStatusTarget] = useState<{ user: ManagedUser; nextActive: boolean } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Bulk import modal state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<BulkRowParsed[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    createdCount: number;
    skippedCount: number;
    results: ImportResultItem[];
  } | null>(null);

  const fetchUsers = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: ManagedUser[] }>('/api/users');
      if (res && res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err: unknown) {
      toast.error('Failed to load users: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [usersRes, branchesRes] = await Promise.all([
          apiGet<{ success: boolean; data: ManagedUser[] }>('/api/users').catch(() => null),
          apiGet<{ success: boolean; data: BranchItem[] }>('/api/public/branches').catch(() => null),
        ]);
        if (!ignore) {
          if (usersRes?.success && Array.isArray(usersRes.data)) {
            setUsers(usersRes.data);
          }
          if (branchesRes?.success && Array.isArray(branchesRes.data)) {
            setBranches(branchesRes.data);
            if (!createForm.branchId && branchesRes.data.length > 0) {
              setCreateForm((prev) => ({ ...prev, branchId: branchesRes.data[0].id }));
            }
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [createForm.branchId]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email ? u.email.toLowerCase().includes(q) : false;
        const matchesPhone = u.phone ? u.phone.includes(q) : false;
        const matchesCode = u.studentCode ? u.studentCode.toLowerCase().includes(q) : false;
        return matchesName || matchesEmail || matchesPhone || matchesCode;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!createForm.phone.trim() && !createForm.email.trim()) {
      toast.error('Provide at least a phone number or email address.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: createForm.name.trim(),
        role: createForm.role,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
      };
      if (currentUserRole === 'SUPER_ADMIN' && createForm.branchId) {
        payload.branchId = createForm.branchId;
      }
      if (createForm.role === 'STUDENT') {
        if (createForm.guardianName.trim()) payload.guardianName = createForm.guardianName.trim();
        if (createForm.guardianPhone.trim()) payload.guardianPhone = createForm.guardianPhone.trim();
      }

      const res = await apiPost<{
        success: boolean;
        message: string;
        data: {
          user: ManagedUser;
          temporaryPassword?: string;
          identifier: string;
        };
      }>('/api/auth/register', payload);

      if (res && res.success) {
        setIsCreateOpen(false);
        setCreatedCreds({
          name: res.data.user.name,
          role: res.data.user.role,
          identifier: res.data.identifier,
          studentCode: res.data.user.studentCode,
          temporaryPassword: res.data.temporaryPassword,
        });
        toast.success('User provisioned successfully!');
        setCreateForm({
          name: '',
          role: 'STUDENT',
          phone: '',
          email: '',
          branchId: currentUserBranchId || (branches[0]?.id ?? ''),
          guardianName: '',
          guardianPhone: '',
        });
        void fetchUsers();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to provision user');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Admin Password Reset
  const handleExecuteReset = async () => {
    if (!resetTargetUser) return;
    setResetting(true);
    try {
      const res = await apiPost<{
        success: boolean;
        data: { temporaryPassword: string; identifier: string };
      }>(`/api/users/${resetTargetUser.id}/reset-password`);

      if (res && res.success && res.data?.temporaryPassword) {
        setIssuedTempPass(res.data.temporaryPassword);
        toast.success('Password reset successfully. A temporary password has been generated.');
        void fetchUsers();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setResetting(false);
    }
  };

  // Handle Status Toggle
  const handleExecuteStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusUpdating(true);
    try {
      await apiPatch(`/api/users/${statusTarget.user.id}/status`, {
        isActive: statusTarget.nextActive,
      });
      toast.success(
        `Account ${statusTarget.nextActive ? 'activated' : 'deactivated'} successfully.`
      );
      setStatusTarget(null);
      void fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Parse CSV
  const parseCsvContent = (content: string) => {
    setCsvText(content);
    setImportResults(null);
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    // Skip header line
    const dataLines = lines.slice(1);
    const rows: BulkRowParsed[] = dataLines.map((line) => {
      // Basic comma split handling quoted strings
      const parts: string[] = [];
      let inQuotes = false;
      let token = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          parts.push(token.trim());
          token = '';
        } else {
          token += ch;
        }
      }
      parts.push(token.trim());

      const name = parts[0] || '';
      const role = (parts[1] || 'STUDENT').toUpperCase();
      const phone = parts[2] || '';
      const email = parts[3] || '';
      const batchName = parts[4] || '';
      const guardianName = parts[5] || '';
      const guardianPhone = parts[6] || '';

      const validRole = ['STUDENT', 'TEACHER', 'GUARDIAN', 'ADMIN'].includes(role);
      let isValid = true;
      let validationError: string | undefined;

      if (!name) {
        isValid = false;
        validationError = 'Name is required';
      } else if (!validRole) {
        isValid = false;
        validationError = `Invalid role "${role}"`;
      } else if (role === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        isValid = false;
        validationError = 'Only Super Admin can import Admins';
      } else if (!phone && !email) {
        isValid = false;
        validationError = 'Phone or Email required';
      }

      return {
        name,
        role,
        phone: phone || undefined,
        email: email || undefined,
        batchName: batchName || undefined,
        guardianName: guardianName || undefined,
        guardianPhone: guardianPhone || undefined,
        isValid,
        validationError,
      };
    });

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) parseCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const payloadRows = parsedRows.map((r) => ({
        name: r.name,
        role: r.role,
        phone: r.phone,
        email: r.email,
        batchName: r.batchName,
        guardianName: r.guardianName,
        guardianPhone: r.guardianPhone,
      }));

      const res = await apiPost<{
        success: boolean;
        message: string;
        data: {
          createdCount: number;
          skippedCount: number;
          results: ImportResultItem[];
        };
      }>('/api/users/import', { rows: payloadRows });

      if (res && res.success && res.data) {
        setImportResults(res.data);
        toast.success(
          `Import complete: ${res.data.createdCount} created, ${res.data.skippedCount} skipped.`
        );
        void fetchUsers();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadResultsCsv = () => {
    if (!importResults || !importResults.results) return;
    const headers = 'Row,Name,Role,Status,Identifier,StudentCode,TemporaryPassword,Reason\n';
    const lines = importResults.results
      .map(
        (r) =>
          `"${r.row}","${r.name}","${r.role}","${r.status}","${r.identifier || ''}","${
            r.studentCode || ''
          }","${r.temporaryPassword || ''}","${r.reason || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduflow-import-credentials-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Management & Provisioning
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Staff provisioning, multi-identifier accounts, forced first-login password changes, and access lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsBulkOpen(true);
              setImportResults(null);
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Import (CSV)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-semibold gap-1.5 shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Provision User
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Input
            type="text"
            placeholder="Search by name, student code, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="md:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full h-10 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Admins</option>
            <option value="GUARDIAN">Guardians</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Account Status</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="INACTIVE">Deactivated Accounts</option>
          </select>
        </div>

        <div className="md:col-span-1 flex justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers()}
            disabled={loading}
            aria-label="Refresh list"
            className="h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Users Table Card */}
      <Card className="border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">User & Role</th>
                <th scope="col" className="px-4 py-3">Identifiers</th>
                <th scope="col" className="px-4 py-3">Branch</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading user directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground text-sm">{u.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant={
                            u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
                              ? 'primary'
                              : u.role === 'TEACHER'
                              ? 'secondary'
                              : u.role === 'STUDENT'
                              ? 'accent'
                              : 'outline'
                          }
                          className="text-[10px] px-1.5 py-0 font-medium"
                        >
                          {u.role}
                        </Badge>
                        {u.mustChangePassword && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                            Temp Password
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 space-y-1">
                      {u.studentCode && (
                        <div className="font-mono text-[11px] font-semibold text-primary">
                          ID: {u.studentCode}
                        </div>
                      )}
                      {u.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Phone className="h-3 w-3" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                      {u.email && (
                        <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Mail className="h-3 w-3" />
                          <span>{u.email}</span>
                        </div>
                      )}
                      {!u.studentCode && !u.phone && !u.email && (
                        <span className="text-muted-foreground italic text-[11px]">No identifier</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground">
                      {u.branch?.name || (u.branchId ? 'Assigned' : 'Global')}
                    </td>

                    <td className="px-4 py-3.5">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetTargetUser(u);
                            setIssuedTempPass(null);
                          }}
                          className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                          title="Generate temporary password"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset Pass
                        </Button>

                        {u.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusTarget({ user: u, nextActive: false })}
                            className="text-[11px] h-7 px-2 gap-1 text-danger hover:bg-danger/10 hover:text-danger"
                            title="Deactivate account"
                          >
                            <UserX className="h-3 w-3" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusTarget({ user: u, nextActive: true })}
                            className="text-[11px] h-7 px-2 gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Reactivate account"
                          >
                            <UserCheck className="h-3 w-3" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision New Account"
        description="Accounts are staff-provisioned. The user will receive a temporary password and must set a new password on initial sign-in."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <Input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Tanvir Ahmed"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Role *</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full h-10 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="GUARDIAN">Guardian</option>
                {currentUserRole === 'SUPER_ADMIN' && <option value="ADMIN">Branch Admin</option>}
              </select>
            </div>

            {currentUserRole === 'SUPER_ADMIN' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Branch *</label>
                <select
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                  className="w-full h-10 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code || 'NO-CODE'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Phone Number</label>
              <Input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="e.g. 01712345678"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="e.g. student@domain.com"
                className="text-xs"
              />
            </div>

            {createForm.role === 'STUDENT' && (
              <>
                <div className="sm:col-span-2 pt-2 border-t border-border">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Optional Guardian Information
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Guardian Name</label>
                  <Input
                    type="text"
                    value={createForm.guardianName}
                    onChange={(e) => setCreateForm({ ...createForm, guardianName: e.target.value })}
                    placeholder="e.g. M. A. Rahman"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Guardian Phone</label>
                  <Input
                    type="text"
                    value={createForm.guardianPhone}
                    onChange={(e) => setCreateForm({ ...createForm, guardianPhone: e.target.value })}
                    placeholder="e.g. 01812345678"
                    className="text-xs"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createSubmitting}>
              Provision Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Credential Reveal (One-time Copy/Print) */}
      <Modal
        isOpen={Boolean(createdCreds)}
        onClose={() => setCreatedCreds(null)}
        title="Account Provisioned Successfully"
        description="Please copy or print these credentials now. For security, temporary passwords are not shown again."
        maxWidth="md"
      >
        {createdCreds && (
          <div className="space-y-4 pt-2">
            <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">User</span>
                <p className="text-sm font-bold text-foreground">{createdCreds.name} ({createdCreds.role})</p>
              </div>

              {createdCreds.studentCode && (
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Student ID</span>
                  <p className="font-mono text-sm font-bold text-primary">{createdCreds.studentCode}</p>
                </div>
              )}

              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Primary Login Identifier</span>
                <p className="font-mono text-sm font-semibold text-foreground">{createdCreds.identifier}</p>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Temporary Password</span>
                <div className="flex items-center justify-between gap-2 bg-surface p-2.5 rounded border border-border mt-1">
                  <span className="font-mono text-sm font-bold tracking-wider text-danger selection:bg-accent">
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

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const printable = `EduFlow Account Credentials\nName: ${createdCreds.name}\nRole: ${createdCreds.role}\nIdentifier: ${createdCreds.identifier}\nStudent Code: ${createdCreds.studentCode || 'N/A'}\nTemporary Password: ${createdCreds.temporaryPassword}\nLogin URL: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(printable);
                  toast.success('All credentials copied to clipboard');
                }}
                className="text-xs gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy Full Details
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCreatedCreds(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Admin Password Reset */}
      <Modal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        title="Admin Password Reset"
        description={`Generate a new temporary password for ${resetTargetUser?.name}.`}
        maxWidth="md"
      >
        {resetTargetUser && (
          <div className="space-y-4 pt-2">
            {issuedTempPass ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-[var(--radius-control)] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  Password has been reset. The user will be required to change this password on next login.
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">New Temporary Password:</span>
                  <div className="flex items-center justify-between gap-2 bg-surface p-2.5 rounded border border-border mt-1">
                    <span className="font-mono text-sm font-bold text-danger">{issuedTempPass}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(issuedTempPass);
                        toast.success('Temporary password copied');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setResetTargetUser(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Resetting the password will immediately revoke all existing active sessions for{' '}
                  <span className="font-semibold text-foreground">{resetTargetUser.name}</span> and issue a 14-character temporary password.
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetTargetUser(null)}
                    disabled={resetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={resetting}
                    onClick={handleExecuteReset}
                  >
                    Generate Temporary Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Status Toggle Confirmation */}
      <Modal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.nextActive ? 'Activate Account' : 'Deactivate Account'}
        description={`Confirm account status change for ${statusTarget?.user.name}.`}
        maxWidth="sm"
      >
        {statusTarget && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {statusTarget.nextActive
                ? `Activating will permit ${statusTarget.user.name} to log in and use EduFlow services.`
                : `Deactivating will immediately lock ${statusTarget.user.name} out of EduFlow and invalidate all active session tokens.`}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusTarget(null)}
                disabled={statusUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={statusTarget.nextActive ? 'primary' : 'danger'}
                size="sm"
                isLoading={statusUpdating}
                onClick={handleExecuteStatusToggle}
              >
                Confirm {statusTarget.nextActive ? 'Activation' : 'Deactivation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: CSV Bulk Import */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk User Import"
        description="Upload or paste a CSV file containing user records. Supports batch enrollment and guardian linking."
        maxWidth="xl"
      >
        <div className="space-y-4 pt-2">
          {!importResults ? (
            <>
              <div className="rounded-[var(--radius-control)] bg-muted/40 p-3 text-[11px] text-muted-foreground border border-border space-y-1">
                <span className="font-semibold text-foreground">Expected CSV Columns:</span>
                <p className="font-mono">name,role,phone,email,batchName,guardianName,guardianPhone</p>
                <p className="text-[10px]">
                  Example: <code className="bg-surface px-1 py-0.5 rounded border border-border">Tasif Hossain,STUDENT,01712345678,student@example.com,HSC Physics,Hossain Ali,01812345678</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-control)] file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Or Paste CSV Text
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => parseCsvContent(e.target.value)}
                  placeholder={`name,role,phone,email,batchName,guardianName,guardianPhone\nRafiq Ahmed,STUDENT,01700000001,,HSC Physics,Ahmed Ali,01800000001`}
                  className="w-full rounded-[var(--radius-control)] border border-border bg-surface p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Preview ({parsedRows.length} rows detected)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ready:{' '}
                      <strong className="text-emerald-600">
                        {parsedRows.filter((r) => r.isValid).length}
                      </strong>{' '}
                      | Invalid:{' '}
                      <strong className="text-danger">
                        {parsedRows.filter((r) => !r.isValid).length}
                      </strong>
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded border border-border text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-muted text-[10px] uppercase font-semibold text-muted-foreground sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Phone / Email</th>
                          <th className="p-2">Batch</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parsedRows.slice(0, 50).map((r, i) => (
                          <tr key={i} className={r.isValid ? '' : 'bg-danger/5'}>
                            <td className="p-2 font-medium">{r.name || '<empty>'}</td>
                            <td className="p-2">{r.role}</td>
                            <td className="p-2 text-muted-foreground">{r.phone || r.email || '<none>'}</td>
                            <td className="p-2 text-muted-foreground">{r.batchName || '-'}</td>
                            <td className="p-2">
                              {r.isValid ? (
                                <span className="text-emerald-600 font-medium text-[11px]">Valid</span>
                              ) : (
                                <span className="text-danger font-medium text-[11px]">
                                  {r.validationError}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOpen(false)}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={importing}
                  disabled={parsedRows.length === 0}
                  onClick={handleExecuteImport}
                >
                  Import {parsedRows.length} Records
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-[var(--radius-control)] border border-primary/20 text-xs">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Import Finished: Successfully created <strong>{importResults.createdCount}</strong>{' '}
                  accounts. <strong>{importResults.skippedCount}</strong> records skipped or invalid.
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-foreground">Import Results & Credentials</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadResultsCsv}
                  className="text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Credentials CSV
                </Button>
              </div>

              <div className="max-h-56 overflow-y-auto rounded border border-border text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-[10px] uppercase font-semibold text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Identifier</th>
                      <th className="p-2">Temporary Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importResults.results.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2">{r.role}</td>
                        <td className="p-2">
                          <span
                            className={
                              r.status === 'CREATED'
                                ? 'text-emerald-600 font-semibold'
                                : 'text-danger font-semibold'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-[11px]">{r.identifier || r.studentCode || '-'}</td>
                        <td className="p-2 font-mono text-[11px] text-danger font-semibold">
                          {r.temporaryPassword || r.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBulkOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
