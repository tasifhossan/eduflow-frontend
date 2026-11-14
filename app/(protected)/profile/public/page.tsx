'use client';

import * as React from 'react';
import { UserCheck, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { RequireRole } from '@/components/providers/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import { TeacherCard, TeacherData } from '@/components/cards/TeacherCard';
import { apiGet, apiPatch } from '@/lib/api';

interface MeProfile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  isPublicProfile?: boolean;
}

export default function TeacherPublicProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [headline, setHeadline] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [qualifications, setQualifications] = React.useState('');
  const [experienceYears, setExperienceYears] = React.useState<number | ''>('');
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isPublicProfile, setIsPublicProfile] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    apiGet<{ success: boolean; data: MeProfile }>('/api/me')
      .then((res) => {
        if (mounted && res.success && res.data) {
          const d = res.data;
          setName(d.name || user?.name || '');
          setHeadline(d.headline || '');
          setBio(d.bio || '');
          setQualifications(d.qualifications || '');
          setExperienceYears(d.experienceYears ?? '');
          setAvatarUrl(d.avatarUrl || null);
          setIsPublicProfile(Boolean(d.isPublicProfile));
        }
      })
      .catch((err) => {
        console.warn('Failed to load profile:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const expYears =
        typeof experienceYears === 'number'
          ? Math.max(0, Math.min(60, experienceYears))
          : undefined;

      const payload = {
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
        experienceYears: expYears,
        avatarUrl: avatarUrl || undefined,
      };

      const res = await apiPatch<{ success: boolean; data: MeProfile }>('/api/me', payload);
      if (res.success) {
        toast.success('Your public profile details have been saved.');
      } else {
        toast.error('Failed to update profile.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const previewData: TeacherData = {
    id: user?.id || 'me',
    name: name || user?.name || 'Faculty Member',
    headline: headline.trim() || undefined,
    bio: bio.trim() || undefined,
    avatarUrl: avatarUrl,
    qualifications: qualifications.trim() || undefined,
    experienceYears: typeof experienceYears === 'number' ? experienceYears : undefined,
    subjectName: 'Faculty Mentor',
    batchCount: 1,
  };

  return (
    <RequireRole roles={['TEACHER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="My Public Profile"
          description="Update your faculty designation, biography, qualifications, and portrait for the public coaching website."
          icon={<UserCheck className="h-6 w-6 text-primary" aria-hidden="true" />}
        />

        {/* Administration Visibility Notice */}
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface-hover/30 text-xs sm:text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Visibility is managed by your coaching center administrators:
            </p>
            <p>
              Once your designation headline and biography are saved, branch administrators decide whether your profile is shown on the public website.
              {isPublicProfile ? (
                <strong className="text-status-success-text block mt-1">
                  ✓ Your profile is currently active and visible on the website.
                </strong>
              ) : (
                <span className="text-warning block mt-1">
                  Your profile is currently not published on the website.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Main Grid: Form on Left, Live Card Preview on Right */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4 bg-surface p-6 rounded-[var(--radius-card)] border border-border">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 space-y-5 bg-surface p-6 rounded-[var(--radius-card)] border border-border"
          >
            <FormField
              label="Designation Headline"
              hint="e.g. Senior Faculty in Mathematics, ex-Notre Dame College"
            >
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
                placeholder="e.g. Senior Higher Math Specialist"
              />
            </FormField>

            <FormField
              label="Biography"
              hint="Concise academic background and mentoring approach (max 1,000 chars)"
            >
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Describe your teaching philosophy, achievements, and academic guidance..."
                className="w-full p-3 rounded-[var(--radius-control)] border border-border bg-surface text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y leading-relaxed"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Qualifications" hint="e.g. M.Sc. in Applied Physics">
                <Input
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. M.Sc. (Physics), DU"
                />
              </FormField>

              <FormField label="Experience (Years)" hint="Years of teaching experience">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={experienceYears}
                  onChange={(e) => {
                    const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setExperienceYears(isNaN(v as number) ? '' : v);
                  }}
                  placeholder="e.g. 7"
                />
              </FormField>
            </div>

            <FormField label="Portrait Photo" hint="Square or circular photo. Max 2 MB (PNG, JPG, WebP).">
              <ImageUpload
                value={avatarUrl}
                onChange={(url) => setAvatarUrl(url)}
                aspectRatio="avatar"
              />
            </FormField>

            <div className="pt-4 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={saving}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Profile
              </Button>
            </div>
          </form>

          {/* Right Column: Live TeacherCard preview */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Live Website Card Preview
            </span>
            <div className="sticky top-20">
              <TeacherCard teacher={previewData} />
            </div>
          </div>
        </div>
        )}
      </div>
    </RequireRole>
  );
}
