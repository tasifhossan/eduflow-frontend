'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiPost, apiPatch } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { EnquiryDrawer, EnquiryDetail } from '@/components/admissions/enquiry-drawer';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  Clock,
  Plus,
  Download,
  Search,
  Kanban,
  Table as TableIcon,
  Phone,
  CalendarCheck,
} from 'lucide-react';

export interface AdmissionsSummary {
  stages: Record<string, number>;
  newLast7Days: number;
  followUpsToday: number;
  followUpsOverdue: number;
  last90Days: {
    total: number;
    admitted: number;
    conversionRate: string;
    conversionRatePct: number;
    sourceCounts: Record<string, number>;
  };
}

interface AdmissionsClientProps {
  currentUserRole: string;
  currentUserBranchId: string | null;
}

const STAGES: Array<{
  key: string;
  label: string;
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
}> = [
  { key: 'NEW', label: 'New', color: 'primary' },
  { key: 'CONTACTED', label: 'Contacted', color: 'secondary' },
  { key: 'VISIT_SCHEDULED', label: 'Visit Scheduled', color: 'accent' },
  { key: 'TRIAL', label: 'Trial Class', color: 'accent' },
  { key: 'ADMITTED', label: 'Admitted', color: 'success' },
  { key: 'LOST', label: 'Lost', color: 'danger' },
];

function formatAge(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  } catch {
    return '—';
  }
}

function getFollowUpStatus(dateStr?: string | null, stage?: string): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr || stage === 'ADMITTED' || stage === 'LOST') return null;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (d < startOfToday) return 'overdue';
  if (d >= startOfToday && d <= endOfToday) return 'today';
  return 'upcoming';
}

export default function AdmissionsClient({
  currentUserRole,
  currentUserBranchId,
}: AdmissionsClientProps) {
  const searchParams = useSearchParams();
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  // URL state
  const initialView = searchParams.get('view') || 'board';
  const initialFollowUp = searchParams.get('followUp') || '';
  const initialStage = searchParams.get('stage') || '';

  const [activeView, setActiveView] = React.useState<'board' | 'table' | 'followups'>(
    initialFollowUp ? 'followups' : initialView === 'table' ? 'table' : 'board'
  );

  // Filters state
  const [filterStage, setFilterStage] = React.useState(initialStage);
  const [filterSource, setFilterSource] = React.useState('');
  const [filterBranch, setFilterBranch] = React.useState('');
  const [filterFollowUp, setFilterFollowUp] = React.useState(initialFollowUp);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [page, setPage] = React.useState(1);

  // Selected enquiry for Drawer
  const [selectedEnquiryId, setSelectedEnquiryId] = React.useState<string | null>(null);

  // Add enquiry modal state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addName, setAddName] = React.useState('');
  const [addPhone, setAddPhone] = React.useState('');
  const [addEmail, setAddEmail] = React.useState('');
  const [addGuardianName, setAddGuardianName] = React.useState('');
  const [addSource, setAddSource] = React.useState('WALK_IN');
  const [addBatchId, setAddBatchId] = React.useState('');
  const [addGrade, setAddGrade] = React.useState('');
  const [addMessage, setAddMessage] = React.useState('');
  const [addFollowUp, setAddFollowUp] = React.useState('');
  const [addBranchId, setAddBranchId] = React.useState(currentUserBranchId || '');
  const [submittingAdd, setSubmittingAdd] = React.useState(false);

  // Quick Move-To Lost reason modal
  const [moveLostTargetId, setMoveLostTargetId] = React.useState<string | null>(null);
  const [moveLostReason, setMoveLostReason] = React.useState('');
  const [submittingMoveLost, setSubmittingMoveLost] = React.useState(false);

  const [refreshKey, setRefreshKey] = React.useState(0);
  const handleRefreshAll = () => setRefreshKey((k) => k + 1);

  // Fetch summary
  const summaryQuery = filterBranch ? `?branchId=${filterBranch}` : '';
  const summaryUrl = `/api/enquiries/summary${summaryQuery}${summaryQuery ? '&' : '?'}t=${refreshKey}`;
  const {
    data: summary,
    loading: summaryLoading,
  } = useApi<AdmissionsSummary>(summaryUrl);

  // Build query string for list
  const listParams = new URLSearchParams();
  listParams.set('page', String(page));
  listParams.set('limit', activeView === 'board' ? '50' : '20');
  if (filterStage) listParams.set('stage', filterStage);
  if (filterSource) listParams.set('source', filterSource);
  if (filterBranch) listParams.set('branchId', filterBranch);
  if (activeView === 'followups') {
    listParams.set('followUp', filterFollowUp || 'today');
  } else if (filterFollowUp) {
    listParams.set('followUp', filterFollowUp);
  }
  if (searchQuery.trim()) listParams.set('q', searchQuery.trim());
  listParams.set('t', String(refreshKey));

  const {
    data: enquiriesData,
    loading: enquiriesLoading,
    error: enquiriesError,
  } = useApi<{
    items: EnquiryDetail[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>(`/api/enquiries?${listParams.toString()}`);

  const items = enquiriesData?.items || [];
  const pagination = enquiriesData?.pagination;

  // Fetch branches (for SUPER_ADMIN)
  const { data: branchesRes } = useApi<Array<{ id: string; name: string }>>(
    isSuperAdmin ? '/api/branches' : null
  );
  const branches = Array.isArray(branchesRes) ? branchesRes : [];

  // Fetch active batches for Add Enquiry dialog
  const effectiveBranchForBatches = isSuperAdmin ? addBranchId : currentUserBranchId;
  const { data: batchesRes } = useApi<{ items?: Array<{ id: string; name: string; archivedAt: string | null }> }>(
    effectiveBranchForBatches ? `/api/batches?branchId=${effectiveBranchForBatches}&limit=100` : '/api/batches?limit=100'
  );
  const availableBatches = (batchesRes?.items || []).filter((b) => b.archivedAt === null);

  // CSV Export handler
  const handleExportCsv = () => {
    const exportParams = new URLSearchParams(listParams);
    exportParams.set('format', 'csv');
    window.open(`/api/enquiries?${exportParams.toString()}`, '_blank');
  };

  // Quick Move-To Stage
  const handleQuickMove = async (enquiryId: string, targetStage: string) => {
    if (targetStage === 'LOST') {
      setMoveLostTargetId(enquiryId);
      return;
    }
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${enquiryId}`, {
        stage: targetStage,
      });
      if (res.success) {
        toast.success(`Enquiry moved to ${targetStage.replace('_', ' ')}`);
        handleRefreshAll();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stage';
      toast.error(msg);
    }
  };

  // Confirm Lost with reason
  const handleConfirmMoveLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveLostTargetId || !moveLostReason.trim()) {
      toast.error('Reason is required when moving to LOST');
      return;
    }
    setSubmittingMoveLost(true);
    try {
      const res = await apiPatch<{ success: boolean; message?: string }>(`/api/enquiries/${moveLostTargetId}`, {
        stage: 'LOST',
        lostReason: moveLostReason.trim(),
      });
      if (res.success) {
        toast.success('Enquiry moved to LOST');
        setMoveLostTargetId(null);
        setMoveLostReason('');
        handleRefreshAll();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stage';
      toast.error(msg);
    } finally {
      setSubmittingMoveLost(false);
    }
  };

  // Add Enquiry submit
  const handleAddEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSubmittingAdd(true);
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(`/api/enquiries`, {
        name: addName.trim(),
        phone: addPhone.trim(),
        email: addEmail.trim() || undefined,
        guardianName: addGuardianName.trim() || undefined,
        source: addSource,
        interestedBatchId: addBatchId || undefined,
        interestedGrade: addGrade.trim() || undefined,
        message: addMessage.trim() || undefined,
        followUpAt: addFollowUp ? new Date(addFollowUp).toISOString() : undefined,
        branchId: isSuperAdmin ? (addBranchId || undefined) : undefined,
      });

      if (res.success) {
        toast.success('Enquiry registered successfully');
        setIsAddOpen(false);
        setAddName('');
        setAddPhone('');
        setAddEmail('');
        setAddGuardianName('');
        setAddBatchId('');
        setAddGrade('');
        setAddMessage('');
        setAddFollowUp('');
        handleRefreshAll();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register enquiry';
      toast.error(msg);
    } finally {
      setSubmittingAdd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Admissions & Enquiries
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track inquiries from website, walk-ins, and phone calls into enrolled students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 text-xs h-9 font-bold"
          >
            <Plus className="h-4 w-4" />
            Add Enquiry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* New Enquiries This Week */}
        <Card className="p-4 bg-surface border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>New Enquiries (7 Days)</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {summaryLoading ? <Skeleton className="h-8 w-16" /> : (summary?.newLast7Days ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fresh candidate leads across all channels
          </p>
        </Card>

        {/* Follow-ups Due */}
        <Card className="p-4 bg-surface border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Follow-Ups Today &amp; Overdue</span>
            <CalendarCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {summaryLoading ? <Skeleton className="h-8 w-12" /> : (summary?.followUpsToday ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground">due today</span>
            {(summary?.followUpsOverdue ?? 0) > 0 && (
              <Badge variant="danger" size="sm" className="ml-auto">
                {summary?.followUpsOverdue} overdue
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Scheduled callback and visit reminders
          </p>
        </Card>

        {/* 90-Day Conversion */}
        <Card className="p-4 bg-surface border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Conversion Rate (90 Days)</span>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary">
              {summaryLoading ? <Skeleton className="h-8 w-14" /> : (summary?.last90Days?.conversionRate ?? '0%')}
            </span>
            <span className="text-xs text-muted-foreground">
              ({summary?.last90Days?.admitted ?? 0} admitted of {summary?.last90Days?.total ?? 0})
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pipeline admission efficiency
          </p>
        </Card>
      </div>

      {/* View Mode & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* View Switcher Tabs */}
        <div className="inline-flex rounded-[var(--radius-control)] border border-border bg-surface-sunken/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeView === 'board'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            Board View
          </button>
          <button
            type="button"
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeView === 'table'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            Table View
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('followups');
              setFilterFollowUp('today');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeView === 'followups'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-accent" />
            Today&apos;s Follow-Ups
          </button>
        </div>

        {/* Search & Common Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full pl-8 pr-3 rounded-[var(--radius-control)] border border-border bg-surface text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Source filter */}
          <Select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs w-32"
          >
            <option value="">All Sources</option>
            <option value="WEBSITE">Website</option>
            <option value="WALK_IN">Walk-In</option>
            <option value="PHONE">Phone</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="REFERRAL">Referral</option>
            <option value="OTHER">Other</option>
          </Select>

          {/* Super Admin Branch filter */}
          {isSuperAdmin && (
            <Select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs w-36"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}

          {/* Clear filters button */}
          {(searchQuery || filterSource || filterStage || filterBranch || filterFollowUp) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterSource('');
                setFilterStage('');
                setFilterBranch('');
                setFilterFollowUp('');
                setPage(1);
              }}
              className="h-9 px-2 text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {enquiriesError && (
        <ErrorState
          title="Failed to load enquiries"
          message="Could not connect to the admissions database. Please check your connection."
          onRetry={handleRefreshAll}
        />
      )}

      {enquiriesLoading && !enquiriesError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* ── BOARD VIEW ──────────────────────────────────────────────────────── */}
      {activeView === 'board' && !enquiriesError && !enquiriesLoading && (
        <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-6">
          {STAGES.map((col) => {
            const colItems = items.filter((item) => item.stage === col.key);
            const count = summary?.stages?.[col.key] ?? colItems.length;

            return (
              <div
                key={col.key}
                className="flex-1 min-w-[270px] lg:max-w-[340px] bg-surface-sunken/40 rounded-[var(--radius-card)] p-3 border border-border flex flex-col gap-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{col.label}</span>
                    <Badge variant={col.color} size="sm">
                      {count}
                    </Badge>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)]">
                  {colItems.map((item) => {
                    const fuStatus = getFollowUpStatus(item.followUpAt, item.stage);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedEnquiryId(item.id)}
                        className="rounded-[var(--radius-control)] border border-border bg-surface p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer space-y-2 text-xs group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatAge(item.createdAt)}
                          </span>
                        </div>

                        {/* Phone and Source */}
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span className="font-mono">{item.phone ? formatPhone(item.phone) : '—'}</span>
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            {item.source}
                          </Badge>
                        </div>

                        {/* Interested Program or Grade */}
                        {(item.interestedBatch?.name || item.interestedGrade) && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            Target: <span className="text-foreground font-medium">{item.interestedBatch?.name || item.interestedGrade}</span>
                          </div>
                        )}

                        {/* Follow up reminder badge */}
                        {fuStatus && (
                          <div className="pt-1 flex items-center justify-between">
                            <Badge
                              variant={fuStatus === 'overdue' ? 'danger' : fuStatus === 'today' ? 'warning' : 'neutral'}
                              size="sm"
                              className="gap-1 text-[10px]"
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {fuStatus === 'overdue' ? 'Overdue' : fuStatus === 'today' ? 'Due Today' : 'Scheduled'}
                            </Badge>

                            {item.followUpAt && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatDate(item.followUpAt)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quick "Move to" menu */}
                        <div
                          className="pt-2 border-t border-border flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-muted-foreground">Move to:</span>
                          <select
                            value={item.stage}
                            onChange={(e) => handleQuickMove(item.id, e.target.value)}
                            disabled={item.stage === 'ADMITTED'}
                            className="text-[11px] h-6 px-1.5 rounded border border-border bg-surface text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                            <option value="TRIAL">Trial</option>
                            <option value="LOST">Lost</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {colItems.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-[var(--radius-control)]">
                      No enquiries
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ──────────────────────────────────────────────────────── */}
      {activeView === 'table' && !enquiriesError && !enquiriesLoading && (
        <Card className="bg-surface border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-sunken/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const fuStatus = getFollowUpStatus(item.followUpAt, item.stage);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedEnquiryId(item.id)}
                      className="hover:bg-surface-sunken/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground block">{item.name}</span>
                        {item.guardianName && (
                          <span className="text-[11px] text-muted-foreground block">
                            Guardian: {item.guardianName}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {item.phone ? formatPhone(item.phone) : '—'}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.stage === 'ADMITTED'
                              ? 'success'
                              : item.stage === 'LOST'
                              ? 'danger'
                              : item.stage === 'TRIAL' || item.stage === 'VISIT_SCHEDULED'
                              ? 'accent'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {item.stage.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {item.source}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {item.branch?.name || item.preferredBranch?.name || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4">
                        {fuStatus ? (
                          <Badge
                            variant={fuStatus === 'overdue' ? 'danger' : fuStatus === 'today' ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {item.followUpAt ? formatDate(item.followUpAt) : fuStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {item.assignedTo?.name || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedEnquiryId(item.id)}
                        >
                          Details →
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No enquiries matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── TODAY'S FOLLOW-UPS VIEW ────────────────────────────────────────── */}
      {activeView === 'followups' && !enquiriesError && !enquiriesLoading && (
        <Card className="bg-surface border-border p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Action Items: Follow-Ups
              </h3>
              <p className="text-xs text-muted-foreground">
                Prioritized inquiries requiring phone or meeting follow-up today
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filterFollowUp || 'today'}
                onChange={(e) => setFilterFollowUp(e.target.value)}
                className="h-8 text-xs w-32"
              >
                <option value="today">Due Today</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedEnquiryId(item.id)}
                className="flex items-center justify-between p-3 rounded-[var(--radius-control)] border border-border hover:bg-surface-sunken/40 cursor-pointer transition-colors text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{item.name}</span>
                    <Badge variant="warning" size="sm">
                      {item.followUpAt ? formatDateTime(item.followUpAt) : 'Today'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                    <span className="font-mono">{item.phone ? formatPhone(item.phone) : '—'}</span>
                    <span>•</span>
                    <span>Stage: {item.stage}</span>
                    <span>•</span>
                    <span>Assigned: {item.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {item.phone && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => {
                        window.location.href = `tel:${item.phone}`;
                      }}
                    >
                      <Phone className="h-3 w-3 text-primary" />
                      Call
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setSelectedEnquiryId(item.id)}
                  >
                    Open Drawer →
                  </Button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No follow-ups due under this filter. All caught up!
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Enquiry Detail Drawer */}
      <EnquiryDrawer
        enquiryId={selectedEnquiryId}
        onClose={() => setSelectedEnquiryId(null)}
        onUpdated={handleRefreshAll}
        currentUserRole={currentUserRole}
        currentUserBranchId={currentUserBranchId}
      />

      {/* Modal: Add Manual Enquiry */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Walk-In / Phone Enquiry"
        description="Register a new admissions lead into the center pipeline."
        maxWidth="lg"
      >
        <form onSubmit={handleAddEnquiry} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Candidate Name" required>
              <Input
                placeholder="Full name of student"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Contact Phone" required hint="11-digit mobile: 01xxxxxxxxx">
              <Input
                type="tel"
                placeholder="017xxxxxxxx"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Email (Optional)">
              <Input
                type="email"
                placeholder="name@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Guardian Name (Optional)">
              <Input
                placeholder="Parent or guardian"
                value={addGuardianName}
                onChange={(e) => setAddGuardianName(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Channel Source">
              <Select value={addSource} onChange={(e) => setAddSource(e.target.value)}>
                <option value="WALK_IN">Walk-In</option>
                <option value="PHONE">Phone Inquiry</option>
                <option value="FACEBOOK">Facebook / Social</option>
                <option value="REFERRAL">Referral</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            <FormField label="Target Course (Optional)">
              <Select value={addBatchId} onChange={(e) => setAddBatchId(e.target.value)}>
                <option value="">Select course / batch</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Class / Grade (Optional)">
              <Input
                placeholder="e.g. Class 10"
                value={addGrade}
                onChange={(e) => setAddGrade(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Schedule Follow-Up (Optional)">
              <Input
                type="datetime-local"
                value={addFollowUp}
                onChange={(e) => setAddFollowUp(e.target.value)}
              />
            </FormField>

            {isSuperAdmin && (
              <FormField label="Assigned Branch">
                <Select value={addBranchId} onChange={(e) => setAddBranchId(e.target.value)}>
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>

          <FormField label="Inquiry Notes">
            <Textarea
              placeholder="Candidate background, expectations, interested timing..."
              rows={3}
              value={addMessage}
              onChange={(e) => setAddMessage(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingAdd}
              className="font-bold"
            >
              {submittingAdd ? 'Saving...' : 'Register Enquiry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Move-To Lost Reason */}
      <Modal
        isOpen={Boolean(moveLostTargetId)}
        onClose={() => setMoveLostTargetId(null)}
        title="Reason for Lost Enquiry"
        description="A reason is required when marking an enquiry as LOST."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmMoveLost} className="space-y-4 pt-2">
          <FormField label="Drop / Lost Reason" required>
            <Textarea
              placeholder="e.g. Schedule mismatch, high fees, joined another center..."
              rows={3}
              value={moveLostReason}
              onChange={(e) => setMoveLostReason(e.target.value)}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMoveLostTargetId(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={submittingMoveLost || !moveLostReason.trim()}
            >
              {submittingMoveLost ? 'Saving...' : 'Confirm Lost'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
