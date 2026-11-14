'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  UserCheck,
  Search,
  Edit2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { PageHeader } from '@/components/dashboard/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ImageUpload } from '@/components/ui/image-upload';
import { TeacherCard, TeacherData } from '@/components/cards/TeacherCard';
import { apiGet, apiPatch } from '@/lib/api';

interface TeacherCmsRecord {
  [key: string]: unknown;
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  branch?: { id: string; name: string } | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  isPublicProfile: boolean;
  publicOrder: number;
  subjects: string[];
  batchCount: number;
  canPublish: boolean;
  isComplete: boolean;
}

export default function WebsiteTeachersPage() {
  const [teachers, setTeachers] = React.useState<TeacherCmsRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState('');
  const [visibilityFilter, setVisibilityFilter] = React.useState<string>('all');

  // Edit Drawer Modal
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<TeacherCmsRecord | null>(null);

  // Form Fields
  const [formHeadline, setFormHeadline] = React.useState('');
  const [formBio, setFormBio] = React.useState('');
  const [formQualifications, setFormQualifications] = React.useState('');
  const [formExperienceYears, setFormExperienceYears] = React.useState<number | ''>('');
  const [formAvatarUrl, setFormAvatarUrl] = React.useState<string | null>(null);
  const [formIsPublic, setFormIsPublic] = React.useState(false);
  const [formPublicOrder, setFormPublicOrder] = React.useState<number>(0);
  const [saving, setSaving] = React.useState(false);

  const loadTeachers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (search.trim()) params.set('q', search.trim());
      if (visibilityFilter === 'public') params.set('isPublicProfile', 'true');
      if (visibilityFilter === 'hidden') params.set('isPublicProfile', 'false');

      const res = await apiGet<{ success: boolean; data: { teachers: TeacherCmsRecord[] } }>(
        `/api/cms/teachers?${params.toString()}`
      );
      if (res.success && res.data?.teachers) {
        setTeachers(res.data.teachers);
      } else {
        setError('Failed to load teachers.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading teachers.');
    } finally {
      setLoading(false);
    }
  }, [search, visibilityFilter]);

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (search.trim()) params.set('q', search.trim());
    if (visibilityFilter === 'public') params.set('isPublicProfile', 'true');
    if (visibilityFilter === 'hidden') params.set('isPublicProfile', 'false');

    apiGet<{ success: boolean; data: { teachers: TeacherCmsRecord[] } }>(
      `/api/cms/teachers?${params.toString()}`
    )
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data?.teachers) {
          setTeachers(res.data.teachers);
        } else {
          setError('Failed to load teachers.');
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error loading teachers.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [search, visibilityFilter]);

  const handleOpenEdit = (t: TeacherCmsRecord) => {
    setEditingTeacher(t);
    setFormHeadline(t.headline || '');
    setFormBio(t.bio || '');
    setFormQualifications(t.qualifications || '');
    setFormExperienceYears(t.experienceYears ?? '');
    setFormAvatarUrl(t.avatarUrl || null);
    setFormIsPublic(t.isPublicProfile);
    setFormPublicOrder(t.publicOrder || 0);
    setEditModalOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!editingTeacher) return;

    if (formIsPublic && (!formHeadline.trim() || !formBio.trim())) {
      toast.error('Both designation headline and biography are required to make profile public.');
      return;
    }

    setSaving(true);
    try {
      const expYears =
        typeof formExperienceYears === 'number'
          ? Math.max(0, Math.min(60, formExperienceYears))
          : undefined;

      const payload = {
        headline: formHeadline.trim() || undefined,
        bio: formBio.trim() || undefined,
        qualifications: formQualifications.trim() || undefined,
        experienceYears: expYears,
        avatarUrl: formAvatarUrl || undefined,
        isPublicProfile: formIsPublic,
        publicOrder: formPublicOrder,
      };

      const res = await apiPatch<{ success: boolean; data: TeacherCmsRecord }>(
        `/api/cms/teachers/${editingTeacher.id}`,
        payload
      );

      if (res.success) {
        toast.success('Teacher public profile updated.');
        setEditModalOpen(false);
        loadTeachers();
      } else {
        toast.error('Failed to update teacher profile.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  // Up/down ordering in table
  const handleQuickReorder = async (teacher: TeacherCmsRecord, delta: number) => {
    const nextOrder = Math.max(0, (teacher.publicOrder || 0) + delta);
    try {
      await apiPatch(`/api/cms/teachers/${teacher.id}`, { publicOrder: nextOrder });
      loadTeachers();
    } catch {
      toast.error('Failed to update display order.');
    }
  };

  const columns: Column<TeacherCmsRecord>[] = [
    {
      key: 'teacher',
      header: 'Faculty Member',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center font-bold text-primary text-xs">
            {t.avatarUrl ? (
              <Image src={t.avatarUrl} alt={t.name} fill sizes="40px" className="object-cover" />
            ) : (
              t.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.headline || 'No headline set'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (t) =>
        t.branch?.name ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Building className="h-3 w-3" aria-hidden="true" />
            {t.branch.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'subjects',
      header: 'Subjects Taught',
      render: (t) => (
        <div className="flex items-center gap-1 flex-wrap max-w-xs">
          {t.subjects && t.subjects.length > 0 ? (
            t.subjects.map((sub) => (
              <Badge key={sub} variant="primary" size="sm">
                {sub}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No active batches</span>
          )}
        </div>
      ),
    },
    {
      key: 'completeness',
      header: 'Profile Completeness',
      render: (t) => {
        const hasHeadline = Boolean(t.headline?.trim());
        const hasBio = Boolean(t.bio?.trim());
        const hasPhoto = Boolean(t.avatarUrl);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className={hasHeadline ? 'text-status-success-text font-medium' : 'text-muted-foreground'}>
                {hasHeadline ? '✓' : '✗'} Headline
              </span>
              <span className={hasBio ? 'text-status-success-text font-medium' : 'text-muted-foreground'}>
                {hasBio ? '✓' : '✗'} Bio
              </span>
              <span className={hasPhoto ? 'text-status-success-text font-medium' : 'text-muted-foreground'}>
                {hasPhoto ? '✓' : '✗'} Photo
              </span>
            </div>
            {!t.canPublish && (
              <span className="text-[11px] text-warning flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Headline & bio required to show publicly
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) =>
        t.isPublicProfile ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-success-bg text-status-success-text border border-status-success-border">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success" aria-hidden="true" />
            Public
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-hover text-muted-foreground border border-border">
            Hidden
          </span>
        ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (t) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs w-6 text-center">{t.publicOrder}</span>
          <button
            type="button"
            onClick={() => handleQuickReorder(t, 1)}
            aria-label="Increase public order"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          >
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={t.publicOrder <= 0}
            onClick={() => handleQuickReorder(t, -1)}
            aria-label="Decrease public order"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (t) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenEdit(t)}
          className="h-8 px-2 text-xs"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Edit Profile
        </Button>
      ),
    },
  ];

  // Dummy teacher data for live preview
  const previewData: TeacherData = {
    id: editingTeacher?.id || 'preview',
    name: editingTeacher?.name || 'Faculty Member',
    headline: formHeadline.trim() || undefined,
    bio: formBio.trim() || undefined,
    avatarUrl: formAvatarUrl,
    qualifications: formQualifications.trim() || undefined,
    experienceYears: typeof formExperienceYears === 'number' ? formExperienceYears : undefined,
    subjectName: editingTeacher?.subjects?.[0] || 'Specialist Mentor',
    batchCount: editingTeacher?.batchCount || 1,
  };

  const canTogglePublic = Boolean(formHeadline.trim() && formBio.trim());

  return (
    <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Faculty Public Profiles"
          description="Curate teacher profiles visible on the public homepage and about page. Profiles require both designation and bio before they can be published."
          icon={<UserCheck className="h-6 w-6 text-primary" aria-hidden="true" />}
        />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-surface p-4 rounded-[var(--radius-card)] border border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search faculty by name or headline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              aria-label="Filter by visibility"
              className="h-10 px-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Profiles</option>
              <option value="public">Public Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Failed to load faculty profiles"
            message={error}
            onRetry={loadTeachers}
          />
        ) : teachers.length === 0 && !loading ? (
          <EmptyState
            title="No faculty members found"
            description="Faculty accounts are created under People > Users with the TEACHER role."
          />
        ) : (
          <DataTable
            columns={columns}
            data={teachers}
            isLoading={loading}
          />
        )}

        {/* Edit Drawer Modal with Live TeacherCard Preview */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Profile: ${editingTeacher?.name}`}
          description="Update public designation, biography, qualifications, experience, and visibility."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={saving}
                onClick={handleSaveTeacher}
              >
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              <FormField
                label="Designation Headline"
                required
                hint="e.g. Senior Faculty in Physics, ex-BUET"
              >
                <Input
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Senior Physics Specialist"
                />
              </FormField>

              <FormField
                label="Biography"
                required
                hint="Concise academic biography for student guidance"
              >
                <textarea
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Over a decade of mentoring students with exceptional conceptual clarity..."
                  className="w-full p-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y leading-relaxed"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Qualifications" hint="e.g. B.Sc. BUET, M.Sc. DU">
                  <Input
                    value={formQualifications}
                    onChange={(e) => setFormQualifications(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. B.Sc. in Civil Engg"
                  />
                </FormField>

                <FormField label="Experience (Years)" hint="Number between 0 and 60">
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={formExperienceYears}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setFormExperienceYears(isNaN(v as number) ? '' : v);
                    }}
                    placeholder="e.g. 8"
                  />
                </FormField>
              </div>

              <FormField label="Profile Photo" hint="Square or circular portrait. Max 2 MB.">
                <ImageUpload
                  value={formAvatarUrl}
                  onChange={(url) => setFormAvatarUrl(url)}
                  aspectRatio="avatar"
                />
              </FormField>

              {/* Public Toggle (Blocked if missing headline or bio) */}
              <div className="p-3.5 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-foreground">
                    Show on Public Website
                  </span>
                  <input
                    type="checkbox"
                    checked={formIsPublic}
                    disabled={!canTogglePublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring disabled:opacity-50"
                  />
                </label>

                {!canTogglePublic && (
                  <p className="text-[11px] text-warning flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Both Headline and Biography must be provided to enable public profile display.
                  </p>
                )}
              </div>

              {/* Display Order */}
              <FormField
                label="Public Display Order"
                hint="Lower numbers display first (0, 1, 2...)"
              >
                <Input
                  type="number"
                  min={0}
                  value={formPublicOrder}
                  onChange={(e) => setFormPublicOrder(parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
            </div>

            {/* Right Column: Live TeacherCard Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Live Public Card Preview
              </span>
              <div className="max-w-xs mx-auto">
                <TeacherCard teacher={previewData} />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </RequireRole>
  );
}
