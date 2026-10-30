'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Filter,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLogItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [inspectedLog, setInspectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (actionFilter) params.set('action', actionFilter);

      const res = await apiGet<AuditLogsResponse>(`/api/audit-logs?${params.toString()}`);
      if (res && res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err: unknown) {
      toast.error('Failed to load audit logs: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (actionFilter) params.set('action', actionFilter);

        const res = await apiGet<AuditLogsResponse>(`/api/audit-logs?${params.toString()}`);
        if (!ignore && res && res.success && res.data) {
          setLogs(res.data.logs || []);
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
      } catch (err: unknown) {
        if (!ignore) {
          toast.error('Failed to load audit logs: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      ignore = true;
    };
  }, [page, limit, actionFilter]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('DEACTIVATED') || action.includes('DELETED')) return 'danger';
    if (action.includes('PROVISIONED') || action.includes('ACTIVATED')) return 'primary';
    if (action.includes('PASSWORD') || action.includes('RESET')) return 'accent';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Security & Audit Trail
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable log of all user provisioning, password updates, deactivations, and administrative events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          disabled={loading}
          className="text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Trail
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Security Actions</option>
            <option value="ACCOUNT_PROVISIONED">ACCOUNT_PROVISIONED</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            <option value="PASSWORD_RESET_REQUESTED">PASSWORD_RESET_REQUESTED</option>
            <option value="PASSWORD_RESET_COMPLETED">PASSWORD_RESET_COMPLETED</option>
            <option value="ADMIN_PASSWORD_RESET">ADMIN_PASSWORD_RESET</option>
            <option value="ACCOUNT_DEACTIVATED">ACCOUNT_DEACTIVATED</option>
            <option value="ACCOUNT_ACTIVATED">ACCOUNT_ACTIVATED</option>
            <option value="BULK_USERS_IMPORTED">BULK_USERS_IMPORTED</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> recorded events
        </span>
      </div>

      {/* Audit Log Table */}
      <Card className="border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Timestamp</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">Target Entity</th>
                <th scope="col" className="px-4 py-3">Branch</th>
                <th scope="col" className="px-4 py-3">IP Address</th>
                <th scope="col" className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No audit records match the selected action filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDateTime(log.createdAt)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={getActionBadgeVariant(log.action)} className="text-[10px] font-mono">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <span className="font-semibold text-foreground text-xs">{log.actor.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({log.actor.role})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">System / Anonymous</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {log.entityType ? (
                        <span>
                          {log.entityType}: {log.entityId ? log.entityId.slice(0, 10) + '...' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground text-[11px]">
                      {log.branch?.name || (log.branchId ? 'Scoped' : 'Global')}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                      {log.ip || '-'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectedLog(log)}
                        className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary-hover"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs gap-1"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs gap-1"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: Metadata Detail Viewer */}
      <Modal
        isOpen={Boolean(inspectedLog)}
        onClose={() => setInspectedLog(null)}
        title="Audit Event Details"
        description={`Event ID: ${inspectedLog?.id}`}
        maxWidth="md"
      >
        {inspectedLog && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Action</span>
                <p className="font-semibold text-foreground font-mono">{inspectedLog.action}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Timestamp</span>
                <p className="text-muted-foreground">{formatDateTime(inspectedLog.createdAt)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Actor</span>
                <p className="text-foreground">
                  {inspectedLog.actor ? `${inspectedLog.actor.name} (${inspectedLog.actor.role})` : 'System'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">IP Address</span>
                <p className="font-mono text-muted-foreground">{inspectedLog.ip || 'N/A'}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                Event Metadata (Sanitized)
              </span>
              <pre className="rounded-[var(--radius-control)] bg-muted/60 p-3 font-mono text-[11px] text-foreground border border-border overflow-x-auto max-h-48">
                {JSON.stringify(inspectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setInspectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
