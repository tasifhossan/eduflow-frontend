'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { MoneyInput } from '@/components/ui/money-input';
import { FormField } from '@/components/ui/form-field';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDateTime, formatPhone } from '@/lib/format';
import { toast } from 'sonner';
import {
  X,
  Phone,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  Copy,
  Printer,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface EnquiryNoteItem {
  id: string;
  kind: 'NOTE' | 'CALL' | 'VISIT';
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

export interface EnquiryDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  subject?: string | null;
  message?: string | null;
  source: string;
  stage: 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'TRIAL' | 'ADMITTED' | 'LOST';
  followUpAt?: string | null;
  lostReason?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  preferredBranchId?: string | null;
  preferredBranch?: { id: string; name: string } | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; role?: string } | null;
  interestedBatchId?: string | null;
  interestedBatch?: { id: string; name: string; branchId?: string } | null;
  interestedGrade?: string | null;
  convertedStudentId?: string | null;
  convertedStudent?: {
    id: string;
    name: string;
    studentCode?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  createdAt: string;
  notes?: EnquiryNoteItem[];
}

export interface ConvertedCredentials {
  student: {
    id: string;
    name: string;
    studentCode?: string | null;
    phone?: string | null;
    temporaryPassword?: string;
  };
  guardian?: {
    id: string;
    name: string;
    phone?: string | null;
    temporaryPassword?: string;
    isNew: boolean;
  } | null;
}

interface EnquiryDrawerProps {
  enquiryId: string | null;
  onClose: () => void;
  onUpdated: () => void;
  currentUserRole?: string;
  currentUserBranchId?: string | null;
}

export function EnquiryDrawer({
  enquiryId,
  onClose,
  onUpdated,
  currentUserRole,
}: EnquiryDrawerProps) {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const [refreshKey, setRefreshKey] = React.useState(0);
  const refreshEnquiry = () => setRefreshKey((k) => k + 1);

  // Fetch enquiry detail
  const {
    data: enquiry,
    loading: enquiryLoading,
    error: enquiryError,
  } = useApi<EnquiryDetail>(
    enquiryId ? `/api/enquiries/${enquiryId}?t=${refreshKey}` : null
  );

  // Duplicate checks
  const [duplicates, setDuplicates] = React.useState<{
    users: Array<{ id: string; name: string; role: string; studentCode?: string | null }>;
    enquiries: Array<{ id: string; name: string; stage: string; createdAt: string }>;
  } | null>(null);

  React.useEffect(() => {
    let isCurrent = true;
    if (enquiry?.phone) {
      apiGet<{
        success: boolean;
        data: {
          users: Array<{ id: string; name: string; role: string; studentCode?: string | null }>;
          enquiries: Array<{ id: string; name: string; stage: string; createdAt: string }>;
        };
      }>(`/api/enquiries/duplicates?phone=${encodeURIComponent(enquiry.phone)}`)
        .then((res) => {
          if (isCurrent && res.success && res.data) {
            // Filter out the current enquiry itself
            const filteredEnqs = (res.data.enquiries || []).filter((e) => e.id !== enquiry.id);
            setDuplicates({ users: res.data.users || [], enquiries: filteredEnqs });
          }
        })
        .catch(() => {
          if (isCurrent) setDuplicates(null);
        });
    }

    return () => {
      isCurrent = false;
    };
  }, [enquiry?.id, enquiry?.phone]);

  const activeDuplicates = enquiry?.phone ? duplicates : null;

  // Fetch branches (for SUPER_ADMIN re-assignment)
  const { data: branchesRes } = useApi<Array<{ id: string; name: string }>>(
    isSuperAdmin ? '/api/branches' : null
  );
  const branches = Array.isArray(branchesRes) ? branchesRes : [];

  // Fetch staff users for assignment
  const { data: usersRes } = useApi<{ items?: Array<{ id: string; name: string; role: string; branchId: string }> }>(
    enquiry?.branchId ? `/api/users?branchId=${enquiry.branchId}&limit=50` : null
  );
  const staffList = (usersRes?.items || []).filter(
    (u) => u.role === 'ADMIN' || u.role === 'TEACHER' || u.role === 'SUPER_ADMIN'
  );

  // Fetch active batches for Convert dialog
  const { data: batchesRes } = useApi<{ items?: Array<{ id: string; name: string; branchId: string; archivedAt: string | null }> }>(
    enquiry?.branchId ? `/api/batches?branchId=${enquiry.branchId}&limit=100` : null
  );
  const availableBatches = (batchesRes?.items || []).filter((b) => b.archivedAt === null);

  // Note form state
  const [noteKind, setNoteKind] = React.useState<'NOTE' | 'CALL' | 'VISIT'>('NOTE');
  const [noteBody, setNoteBody] = React.useState('');
  const [submittingNote, setSubmittingNote] = React.useState(false);

  // Lost dialog state
  const [isLostDialogOpen, setIsLostDialogOpen] = React.useState(false);
  const [lostReason, setLostReason] = React.useState('');
  const [submittingLost, setSubmittingLost] = React.useState(false);

  // Convert dialog state
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);
  const [convertBatchId, setConvertBatchId] = React.useState('');
  const [convertName, setConvertName] = React.useState('');
  const [convertPhone, setConvertPhone] = React.useState('');
  const [convertEmail, setConvertEmail] = React.useState('');
  const [convertGuardianName, setConvertGuardianName] = React.useState('');
  const [convertGuardianPhone, setConvertGuardianPhone] = React.useState('');
  const [convertFee, setConvertFee] = React.useState('');
  const [submittingConvert, setSubmittingConvert] = React.useState(false);

  // One-time credentials dialog state
  const [credentials, setCredentials] = React.useState<ConvertedCredentials | null>(null);

  // Follow-up date state
  const [followUpDateInput, setFollowUpDateInput] = React.useState<string | null>(null);
  const currentFollowUpValue =
    followUpDateInput !== null
      ? followUpDateInput
      : enquiry?.followUpAt
      ? new Date(enquiry.followUpAt).toISOString().slice(0, 16)
      : '';

  const handleOpenConvert = () => {
    if (enquiry) {
      setConvertName(enquiry.name || '');
      setConvertPhone(enquiry.phone || '');
      setConvertEmail(enquiry.email || '');
      setConvertGuardianName(enquiry.guardianName || '');
      setConvertGuardianPhone('');
      setConvertBatchId(enquiry.interestedBatchId || '');
      setConvertFee('');
    }
    setIsConvertOpen(true);
  };

  if (!enquiryId) return null;

  // Phone action helpers
  const cleanPhone = enquiry?.phone ? enquiry.phone.replace(/\D/g, '') : '';
  const waDigits = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

  // Handle stage change
  const handleStageSelect = async (newStage: string) => {
    if (!enquiry) return;
    if (newStage === 'LOST') {
      setIsLostDialogOpen(true);
      return;
    }
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}`, {
        stage: newStage,
      });
      if (res.success) {
        toast.success(`Stage updated to ${newStage}`);
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stage';
      toast.error(msg);
    }
  };

  // Handle Lost confirm
  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry || !lostReason.trim()) {
      toast.error('Reason is required when marking an enquiry as LOST');
      return;
    }
    setSubmittingLost(true);
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}`, {
        stage: 'LOST',
        lostReason: lostReason.trim(),
      });
      if (res.success) {
        toast.success('Enquiry marked as LOST');
        setIsLostDialogOpen(false);
        setLostReason('');
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update enquiry';
      toast.error(msg);
    } finally {
      setSubmittingLost(false);
    }
  };

  // Handle follow up date change
  const handleFollowUpSave = async () => {
    if (!enquiry) return;
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}`, {
        followUpAt: currentFollowUpValue ? new Date(currentFollowUpValue).toISOString() : null,
      });
      if (res.success) {
        toast.success(currentFollowUpValue ? 'Follow-up scheduled' : 'Follow-up cleared');
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule follow-up';
      toast.error(msg);
    }
  };

  // Handle staff assignment
  const handleAssignStaff = async (staffId: string) => {
    if (!enquiry) return;
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}`, {
        assignedToId: staffId || null,
      });
      if (res.success) {
        toast.success(staffId ? 'Staff assigned successfully' : 'Assignee removed');
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign staff';
      toast.error(msg);
    }
  };

  // Handle branch re-assignment (SUPER_ADMIN)
  const handleAssignBranch = async (branchId: string) => {
    if (!enquiry || !isSuperAdmin) return;
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}`, {
        branchId: branchId || null,
      });
      if (res.success) {
        toast.success('Branch assigned successfully');
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign branch';
      toast.error(msg);
    }
  };

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry || !noteBody.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(`/api/enquiries/${enquiry.id}/notes`, {
        kind: noteKind,
        body: noteBody.trim(),
      });
      if (res.success) {
        toast.success('Note added to timeline');
        setNoteBody('');
        void refreshEnquiry();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add note';
      toast.error(msg);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Convert
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry) return;
    if (!convertName.trim() || !convertPhone.trim() || !convertBatchId) {
      toast.error('Name, phone, and batch are required for student admission');
      return;
    }
    setSubmittingConvert(true);
    try {
      const payload = {
        name: convertName.trim(),
        phone: convertPhone.trim(),
        email: convertEmail.trim() || undefined,
        batchId: convertBatchId,
        guardian:
          convertGuardianName.trim() || convertGuardianPhone.trim()
            ? {
                name: convertGuardianName.trim() || undefined,
                phone: convertGuardianPhone.trim() || undefined,
              }
            : undefined,
        admissionFee: convertFee.trim() || undefined,
      };

      const res = await apiPost<{
        success: boolean;
        message?: string;
        data: ConvertedCredentials;
      }>(`/api/enquiries/${enquiry.id}/convert`, payload);

      if (res.success && res.data) {
        toast.success('Student admitted successfully!');
        setIsConvertOpen(false);
        setCredentials(res.data);
        void refreshEnquiry();
        onUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert enquiry to student';
      toast.error(msg);
    } finally {
      setSubmittingConvert(false);
    }
  };

  return (
    <>
      {/* Slide-over backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enquiry details"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col focus:outline-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-sunken/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground truncate max-w-[280px]">
                {enquiry?.name || 'Enquiry Details'}
              </h2>
              {enquiry?.stage && (
                <Badge
                  variant={
                    enquiry.stage === 'ADMITTED'
                      ? 'success'
                      : enquiry.stage === 'LOST'
                      ? 'danger'
                      : enquiry.stage === 'TRIAL' || enquiry.stage === 'VISIT_SCHEDULED'
                      ? 'accent'
                      : 'primary'
                  }
                  size="sm"
                >
                  {enquiry.stage.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Source: {enquiry?.source || 'WEBSITE'}</span>
              <span>•</span>
              <span>Branch: {enquiry?.branch?.name || enquiry?.preferredBranch?.name || 'Unassigned'}</span>
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {enquiryLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading enquiry details...</span>
            </div>
          )}

          {enquiryError && (
            <div className="rounded-[var(--radius-card)] bg-danger-subtle p-4 border border-danger/30 text-danger text-xs">
              Failed to load enquiry details.
            </div>
          )}

          {enquiry && (
            <>
              {/* Duplicate phone warning banner */}
              {activeDuplicates && (activeDuplicates.users.length > 0 || activeDuplicates.enquiries.length > 0) && (
                <div
                  role="alert"
                  className="rounded-[var(--radius-control)] bg-accent-subtle/70 border border-accent/40 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 font-bold text-accent-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
                    <span>Matching phone detected</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeDuplicates.users.length > 0 && (
                      <span>
                        Registered user:{' '}
                        {activeDuplicates.users.map((u) => `${u.name} (${u.role}${u.studentCode ? ` - ${u.studentCode}` : ''})`).join(', ')}.{' '}
                      </span>
                    )}
                    {activeDuplicates.enquiries.length > 0 && (
                      <span>
                        Existing enquiry:{' '}
                        {activeDuplicates.enquiries.map((e) => `${e.name} [${e.stage}]`).join(', ')}.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Converted Student Banner */}
              {enquiry.convertedStudent && (
                <div className="rounded-[var(--radius-control)] bg-secondary-subtle/80 border border-secondary/30 p-3.5 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                      <span>Enrolled Student</span>
                    </div>
                    <p className="text-foreground font-semibold">
                      {enquiry.convertedStudent.name}
                      {enquiry.convertedStudent.studentCode && (
                        <span className="text-muted-foreground font-mono ml-2">
                          ({enquiry.convertedStudent.studentCode})
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="success" size="sm">Admitted</Badge>
                </div>
              )}

              {/* Action Buttons: Call, WhatsApp, Convert */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {enquiry.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs justify-center"
                    onClick={() => {
                      window.location.href = `tel:${enquiry.phone}`;
                    }}
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    Call
                  </Button>
                )}

                {enquiry.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs justify-center"
                    onClick={() => {
                      window.open(`https://wa.me/${waDigits}`, '_blank');
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    WhatsApp
                  </Button>
                )}

                {enquiry.stage !== 'ADMITTED' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="h-9 gap-1.5 text-xs font-bold justify-center col-span-2 sm:col-span-1"
                    onClick={handleOpenConvert}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Convert
                  </Button>
                )}
              </div>

              {/* Contact Details Grid */}
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                    <span className="font-semibold text-foreground font-mono">
                      {enquiry.phone ? formatPhone(enquiry.phone) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email Address</span>
                    <span className="font-semibold text-foreground truncate block">
                      {enquiry.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Guardian Name</span>
                    <span className="font-semibold text-foreground">
                      {enquiry.guardianName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Target Program / Grade</span>
                    <span className="font-semibold text-foreground">
                      {enquiry.interestedBatch?.name || enquiry.interestedGrade || '—'}
                    </span>
                  </div>
                </div>

                {enquiry.message && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block text-[11px] mb-1">Inquiry Message:</span>
                    <p className="text-xs text-foreground bg-surface-sunken/50 p-2.5 rounded border border-border/60 leading-relaxed italic">
                      &quot;{enquiry.message}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Pipeline Stage & Assignment Controls */}
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pipeline Controls
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Stage Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Pipeline Stage</label>
                    <Select
                      value={enquiry.stage}
                      onChange={(e) => handleStageSelect(e.target.value)}
                      disabled={enquiry.stage === 'ADMITTED'}
                    >
                      <option value="NEW">New Enquiry</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                      <option value="TRIAL">Trial Class</option>
                      <option value="ADMITTED" disabled>Admitted (via Convert)</option>
                      <option value="LOST">Lost</option>
                    </Select>
                  </div>

                  {/* Assign to Staff */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Assigned Counselor</label>
                    <Select
                      value={enquiry.assignedToId || ''}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Follow-up Date/Time */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Follow-Up Date & Time</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={currentFollowUpValue}
                      onChange={(e) => setFollowUpDateInput(e.target.value)}
                      className="text-xs h-9 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFollowUpSave}
                      className="h-9 px-3 text-xs"
                    >
                      Save
                    </Button>
                    {enquiry.followUpAt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFollowUpDateInput('');
                          void apiPatch(`/api/enquiries/${enquiry.id}`, { followUpAt: null }).then(() => {
                            toast.success('Follow-up cleared');
                            refreshEnquiry();
                            onUpdated();
                          });
                        }}
                        className="h-9 px-2 text-xs text-danger"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {enquiry.followUpAt && (
                    <span className="text-[11px] text-muted-foreground block">
                      Scheduled for: {formatDateTime(enquiry.followUpAt)}
                    </span>
                  )}
                </div>

                {/* Branch assignment (SUPER_ADMIN only) */}
                {isSuperAdmin && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Branch Assignment (Super Admin)
                    </label>
                    <Select
                      value={enquiry.branchId || ''}
                      onChange={(e) => handleAssignBranch(e.target.value)}
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* Notes Timeline */}
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Notes & Activity Timeline ({enquiry.notes?.length || 0})
                  </h3>
                </div>

                {/* Add note form */}
                <form onSubmit={handleAddNote} className="space-y-2 bg-surface-sunken/40 p-3 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <Select
                      value={noteKind}
                      onChange={(e) => setNoteKind(e.target.value as 'NOTE' | 'CALL' | 'VISIT')}
                      className="h-8 text-xs w-28"
                    >
                      <option value="NOTE">Note</option>
                      <option value="CALL">Call Log</option>
                      <option value="VISIT">Campus Visit</option>
                    </Select>
                    <span className="text-[11px] text-muted-foreground flex-1">
                      Max 1000 characters
                    </span>
                  </div>
                  <Textarea
                    placeholder="Log student interest, call notes, or guardian follow-up..."
                    rows={2}
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    className="text-xs"
                    required
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submittingNote || !noteBody.trim()}
                      className="h-7 text-xs gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Add Entry
                    </Button>
                  </div>
                </form>

                {/* Timeline items */}
                {enquiry.notes && enquiry.notes.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {enquiry.notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded border border-border/70 bg-surface-sunken/20 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {n.author.name} ({n.author.role})
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(n.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Badge
                            variant={n.kind === 'CALL' ? 'secondary' : n.kind === 'VISIT' ? 'accent' : 'neutral'}
                            size="sm"
                          >
                            {n.kind}
                          </Badge>
                          <p className="text-foreground whitespace-pre-wrap flex-1">{n.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center italic">
                    No notes or activity recorded yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Mark as Lost */}
      <Modal
        isOpen={isLostDialogOpen}
        onClose={() => setIsLostDialogOpen(false)}
        title="Mark Enquiry as Lost"
        description="Please specify the reason this enquiry did not convert."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmLost} className="space-y-4 pt-2">
          <FormField label="Reason for Drop / Lost" required>
            <Textarea
              placeholder="e.g. Course fee was too high; enrolled at another center; timing conflict..."
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLostDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={submittingLost || !lostReason.trim()}
            >
              {submittingLost ? 'Saving...' : 'Confirm Lost'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Convert to Student */}
      <Modal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title={`Admit Student: ${enquiry?.name}`}
        description="Creates student account with temporary password and enrolls them into the chosen batch."
        maxWidth="lg"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Student Full Name" required>
              <Input
                value={convertName}
                onChange={(e) => setConvertName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Student Phone Number" required hint="11-digit mobile">
              <Input
                type="tel"
                value={convertPhone}
                onChange={(e) => setConvertPhone(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Student Email Address (Optional)">
              <Input
                type="email"
                value={convertEmail}
                onChange={(e) => setConvertEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </FormField>
            <FormField label="Enrolling Batch" required>
              <Select
                value={convertBatchId}
                onChange={(e) => setConvertBatchId(e.target.value)}
                required
              >
                <option value="">Select active batch...</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Guardian Information */}
          <div className="pt-2 border-t border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Guardian Details (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Guardian Name">
                <Input
                  value={convertGuardianName}
                  onChange={(e) => setConvertGuardianName(e.target.value)}
                  placeholder="Parent or guardian name"
                />
              </FormField>
              <FormField label="Guardian Phone Number" hint="Will create guardian portal account">
                <Input
                  type="tel"
                  value={convertGuardianPhone}
                  onChange={(e) => setConvertGuardianPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                />
              </FormField>
            </div>
          </div>

          {/* Optional Admission Fee */}
          <div className="pt-2 border-t border-border space-y-1">
            <FormField label="Admission Fee Charge (Optional)" hint="Leave empty or 0 if waived">
              <MoneyInput
                value={convertFee}
                onChange={setConvertFee}
                placeholder="0.00"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConvertOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingConvert}
              className="font-bold"
            >
              {submittingConvert ? 'Admitting...' : 'Complete Admission'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: One-Time Credentials (Reused pattern) */}
      <Modal
        isOpen={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Student Provisioned Successfully"
        description="Share these one-time credentials with the student and guardian. They will not be displayed again."
        maxWidth="md"
      >
        {credentials && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Student Credentials */}
            <div className="p-3 rounded border border-border bg-surface-sunken/40 space-y-2">
              <span className="font-bold text-foreground text-xs block">Student Credentials</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Student Code:</span>
                  <span className="font-mono font-bold text-foreground">{credentials.student.studentCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Identifier:</span>
                  <span className="font-mono text-foreground">{credentials.student.phone || credentials.student.studentCode}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Temporary Password:</span>
                <div className="flex items-center justify-between bg-surface p-2 rounded border border-border mt-1">
                  <span className="font-mono font-bold text-danger text-xs">{credentials.student.temporaryPassword}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 px-2"
                    onClick={() => {
                      if (credentials.student.temporaryPassword) {
                        navigator.clipboard.writeText(credentials.student.temporaryPassword);
                        toast.success('Student password copied');
                      }
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            {/* Guardian Credentials if created */}
            {credentials.guardian && (
              <div className="p-3 rounded border border-border bg-surface-sunken/40 space-y-2">
                <span className="font-bold text-foreground text-xs block">
                  Guardian Portal Account {credentials.guardian.isNew ? '(Newly Created)' : '(Existing)'}
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Name:</span>
                    <span className="font-bold text-foreground">{credentials.guardian.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Phone:</span>
                    <span className="font-mono text-foreground">{credentials.guardian.phone || 'N/A'}</span>
                  </div>
                </div>
                {credentials.guardian.temporaryPassword && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Guardian Temporary Password:</span>
                    <div className="flex items-center justify-between bg-surface p-2 rounded border border-border mt-1">
                      <span className="font-mono font-bold text-danger text-xs">
                        {credentials.guardian.temporaryPassword}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => {
                          if (credentials.guardian?.temporaryPassword) {
                            navigator.clipboard.writeText(credentials.guardian.temporaryPassword);
                            toast.success('Guardian password copied');
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons: Copy Full Details, Print, Done */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    const text = `EduFlow Account Credentials\nName: ${credentials.student.name}\nStudent Code: ${credentials.student.studentCode || 'N/A'}\nTemporary Password: ${credentials.student.temporaryPassword}\nLogin: ${window.location.origin}/login${credentials.guardian ? `\n\nGuardian Name: ${credentials.guardian.name}\nGuardian Phone: ${credentials.guardian.phone}\nGuardian Password: ${credentials.guardian.temporaryPassword || 'Existing account'}` : ''}`;
                    navigator.clipboard.writeText(text);
                    toast.success('All credentials copied to clipboard');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Details
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCredentials(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
