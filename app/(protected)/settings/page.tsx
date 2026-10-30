'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPatch, ApiResponse } from '@/lib/api';
import { getCurrentUserClient } from '@/lib/client-auth';
import { useCenter } from '@/components/providers/center-provider';
import {
  FullCenterSettings,
  HomepageSettings,
  AnnouncementSettings,
  HighlightItem,
  WhyChooseUsItem,
  AdmissionStepItem,
} from '@/lib/types/center';
import { enforceWcagAA, sanitizeHex } from '@/lib/theme';
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL } from '@/lib/format';
import {
  Palette,
  Phone,
  Globe,
  Receipt,
  ToggleLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  Home,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
} from 'lucide-react';

const WHITELISTED_ICONS = [
  'BookOpen',
  'GraduationCap',
  'Award',
  'Users',
  'Clock',
  'CheckCircle',
  'CheckCircle2',
  'Star',
  'Shield',
  'ShieldCheck',
  'Sparkles',
  'Target',
  'Compass',
  'Lightbulb',
  'Smile',
  'Heart',
  'TrendingUp',
  'Zap',
  'HelpCircle',
  'FileText',
  'Calendar',
  'MapPin',
  'Brain',
  'Layers',
  'Flame',
  'Trophy',
  'BadgeCheck',
] as const;

const TIMEZONES = [
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dubai',
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Singapore',
  'Asia/Tokyo',
];

import { PagesSettingsTab } from '@/components/settings/pages-settings-tab';

export default function SettingsPage() {
  const router = useRouter();
  const { updateCenter } = useCenter();
  const [activeTab, setActiveTab] = useState<'branding' | 'contact' | 'locale' | 'receipts' | 'features' | 'homepage' | 'pages'>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [initialData, setInitialData] = useState<FullCenterSettings | null>(null);
  const [formData, setFormData] = useState<FullCenterSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const user = await getCurrentUserClient();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'SUPER_ADMIN') {
        toast.error('Access restricted to Super Admin');
        router.push('/dashboard');
        return;
      }

      try {
        const res = await apiGet<ApiResponse<FullCenterSettings>>('/api/settings');
        if (res.success && res.data) {
          setInitialData(res.data);
          setFormData(res.data);
        } else {
          toast.error(res.message || 'Failed to load settings');
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Error loading settings');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  // Unsaved changes warning
  const isDirty = React.useMemo(() => {
    if (!initialData || !formData) return false;
    return JSON.stringify(initialData) !== JSON.stringify(formData);
  }, [initialData, formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (loading || !formData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-slate-500">Loading center settings...</span>
      </div>
    );
  }

  // Handle generic field change
  const handleChange = (field: keyof FullCenterSettings, value: unknown) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Handle nested social field change
  const handleSocialChange = (key: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        socials: {
          ...(prev.socials || {}),
          [key]: value,
        },
      };
    });
  };

  // Handle feature flag toggle
  const handleFeatureToggle = (flag: string, value: boolean) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        features: {
          ...prev.features,
          [flag]: value,
        },
      };
    });
  };

  // Cloudinary image upload helper
  const handleImageUpload = async (file: File, type: 'logo' | 'favicon' | 'hero') => {
    // Client format validation
    const validFormats = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validFormats.includes(file.type)) {
      toast.error('Allowed image formats: PNG, JPG, or WEBP (SVG is not supported)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be smaller than 2 MB');
      return;
    }

    const setUploading =
      type === 'logo'
        ? setUploadingLogo
        : type === 'favicon'
        ? setUploadingFavicon
        : setUploadingHero;
    setUploading(true);

    try {
      // 1. Get signed signature from backend
      const sigRes = await apiGet<ApiResponse<{
        signature: string;
        timestamp: number;
        cloudName: string;
        apiKey: string;
        folder: string;
        allowed_formats?: string;
        max_bytes?: number;
      }>>(`/api/uploads/signature?folder=branding&type=branding`);

      if (!sigRes.success || !sigRes.data) {
        throw new Error(sigRes.message || 'Failed to authorize image upload');
      }

      const { signature, timestamp, cloudName, apiKey, folder, allowed_formats, max_bytes } = sigRes.data;

      // 2. Prepare multipart upload form
      const data = new FormData();
      data.append('file', file);
      data.append('api_key', apiKey);
      data.append('timestamp', String(timestamp));
      data.append('signature', signature);
      data.append('folder', folder);
      if (allowed_formats) data.append('allowed_formats', allowed_formats);
      if (max_bytes) data.append('max_bytes', String(max_bytes));

      // 3. Post to Cloudinary
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Cloudinary upload failed');
      }

      const resData = await res.json();
      const secureUrl = resData.secure_url;

      if (type === 'logo') {
        handleChange('logoUrl', secureUrl);
      } else if (type === 'favicon') {
        handleChange('faviconUrl', secureUrl);
      } else {
        handleHomepageChange('heroImageUrl', secureUrl);
      }
      toast.success(`${type === 'logo' ? 'Logo' : type === 'favicon' ? 'Favicon' : 'Hero banner image'} uploaded successfully`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Homepage helpers
  const handleHomepageChange = <K extends keyof HomepageSettings>(field: K, value: HomepageSettings[K]) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        homepage: {
          ...(prev.homepage || {}),
          [field]: value,
        },
      };
    });
  };

  const handleAnnouncementChange = (field: keyof AnnouncementSettings, value: unknown) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const current = prev.homepage?.announcement || { enabled: false, text: '', linkLabel: '', linkUrl: '' };
      return {
        ...prev,
        homepage: {
          ...(prev.homepage || {}),
          announcement: {
            ...current,
            [field]: value,
          },
        },
      };
    });
  };

  const addHighlight = () => {
    const list = formData?.homepage?.highlights || [];
    if (list.length >= 4) return;
    handleHomepageChange('highlights', [...list, { value: '', label: '' }]);
  };

  const updateHighlight = (index: number, field: keyof HighlightItem, val: string) => {
    const list = [...(formData?.homepage?.highlights || [])];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: val };
    handleHomepageChange('highlights', list);
  };

  const removeHighlight = (index: number) => {
    const list = (formData?.homepage?.highlights || []).filter((_, i) => i !== index);
    handleHomepageChange('highlights', list);
  };

  const moveHighlight = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData?.homepage?.highlights || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    handleHomepageChange('highlights', list);
  };

  const addWhyChooseUs = () => {
    const list = formData?.homepage?.whyChooseUs || [];
    if (list.length >= 6) return;
    handleHomepageChange('whyChooseUs', [...list, { title: '', description: '', icon: 'BookOpen' }]);
  };

  const updateWhyChooseUs = (index: number, field: keyof WhyChooseUsItem, val: string) => {
    const list = [...(formData?.homepage?.whyChooseUs || [])];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: val };
    handleHomepageChange('whyChooseUs', list);
  };

  const removeWhyChooseUs = (index: number) => {
    const list = (formData?.homepage?.whyChooseUs || []).filter((_, i) => i !== index);
    handleHomepageChange('whyChooseUs', list);
  };

  const moveWhyChooseUs = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData?.homepage?.whyChooseUs || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    handleHomepageChange('whyChooseUs', list);
  };

  const addAdmissionStep = () => {
    const list = formData?.homepage?.admissionSteps || [];
    if (list.length >= 5) return;
    handleHomepageChange('admissionSteps', [...list, { title: '', description: '' }]);
  };

  const updateAdmissionStep = (index: number, field: keyof AdmissionStepItem, val: string) => {
    const list = [...(formData?.homepage?.admissionSteps || [])];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: val };
    handleHomepageChange('admissionSteps', list);
  };

  const removeAdmissionStep = (index: number) => {
    const list = (formData?.homepage?.admissionSteps || []).filter((_, i) => i !== index);
    handleHomepageChange('admissionSteps', list);
  };

  const moveAdmissionStep = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData?.homepage?.admissionSteps || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    handleHomepageChange('admissionSteps', list);
  };

  // Live WCAG analysis
  const primarySanitized = sanitizeHex(formData.primaryColor || '#0ea5e9');
  const contrastInfo = enforceWcagAA(primarySanitized);

  // Submit PATCH to backend
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload: Partial<FullCenterSettings> = {
        name: formData.name.trim(),
        shortName: formData.shortName.trim(),
        tagline: formData.tagline || '',
        logoUrl: formData.logoUrl || null,
        faviconUrl: formData.faviconUrl || null,
        primaryColor: formData.primaryColor,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        whatsapp: formData.whatsapp ? formData.whatsapp.trim() : null,
        address: formData.address ? formData.address.trim() : null,
        socials: formData.socials || {},
        currency: formData.currency.trim(),
        currencySymbol: formData.currencySymbol.trim(),
        timezone: formData.timezone,
        defaultLocale: formData.defaultLocale,
        academicYearStartMonth: formData.academicYearStartMonth || 1,
        feeDueDay: typeof formData.feeDueDay === 'number' ? formData.feeDueDay : 10,
        weekStartsOn: typeof formData.weekStartsOn === 'number' ? formData.weekStartsOn : 6,
        receiptHeader: formData.receiptHeader || null,
        receiptFooter: formData.receiptFooter || null,
        features: formData.features,
        homepage: {
          heroBadge: formData.homepage?.heroBadge?.trim() || undefined,
          heroPoints: (formData.homepage?.heroPoints || [])
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter((p) => p.length > 0)
            .slice(0, 3),
          heroTitle: formData.homepage?.heroTitle || undefined,
          heroSubtitle: formData.homepage?.heroSubtitle || undefined,
          heroImageUrl: formData.homepage?.heroImageUrl?.trim() || null,
          announcement: formData.homepage?.announcement
            ? {
                enabled: !!formData.homepage.announcement.enabled,
                text: formData.homepage.announcement.text || '',
                linkLabel: formData.homepage.announcement.linkLabel || undefined,
                linkUrl: formData.homepage.announcement.linkUrl?.trim() || null,
              }
            : undefined,
          highlights: (formData.homepage?.highlights || [])
            .filter((h) => h.value?.trim() || h.label?.trim())
            .slice(0, 4),
          whyChooseUs: (formData.homepage?.whyChooseUs || [])
            .filter((w) => w.title?.trim())
            .slice(0, 6),
          admissionSteps: (formData.homepage?.admissionSteps || [])
            .filter((s) => s.title?.trim())
            .slice(0, 5),
          showFees: formData.homepage?.showFees !== false,
          showPhotoGallery: formData.homepage?.showPhotoGallery !== false,
        },
        officeHours: formData.officeHours ? formData.officeHours.trim() : null,
        about: formData.about
          ? {
              headline: formData.about.headline?.trim() || undefined,
              body: formData.about.body?.trim() || undefined,
              mission: formData.about.mission?.trim() || undefined,
              vision: formData.about.vision?.trim() || undefined,
              facilities: (formData.about.facilities || [])
                .map((f) => (typeof f === 'string' ? f.trim() : ''))
                .filter((f) => f.length > 0)
                .slice(0, 8),
            }
          : undefined,
        legal: formData.legal
          ? {
              privacyText: formData.legal.privacyText?.trim() || null,
              termsText: formData.legal.termsText?.trim() || null,
            }
          : undefined,
      };

      const res = await apiPatch<ApiResponse<FullCenterSettings>>('/api/settings', payload);
      if (res.success && res.data) {
        setInitialData(res.data);
        setFormData(res.data);
        updateCenter(res.data);
        toast.success('Center settings updated successfully');
      } else {
        toast.error(res.message || 'Failed to update settings');
      }
    } catch (err: unknown) {
      const apiErr = err as { validationErrors?: Record<string, string>; message?: string };
      if (apiErr.validationErrors) {
        setErrors(apiErr.validationErrors);
      }
      toast.error(err instanceof Error ? err.message : 'Validation error while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
      setErrors({});
      toast.info('Settings reset to last saved state');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Center Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure coaching center branding, contact details, regional locale, and active modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-medium">You have unsaved changes. Remember to click &quot;Save Changes&quot; to publish them.</span>
          </div>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="font-bold underline hover:text-amber-950 ml-4 cursor-pointer"
          >
            Save now
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'branding'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          Branding & Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'contact'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Phone className="h-4 w-4" />
          Contact & Socials
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locale')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'locale'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-4 w-4" />
          Locale & Currency
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'receipts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Receipt Notes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'features'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ToggleLeft className="h-4 w-4" />
          Feature Flags
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('homepage')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'homepage'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="h-4 w-4" />
          Homepage
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'pages'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Pages &amp; Content
        </button>
      </div>

      {/* Tab 1: Branding & Identity */}
      {activeTab === 'branding' && (
        <div className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Center Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Apex Academic Care"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Short Name / Acronym *
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => handleChange('shortName', e.target.value)}
                placeholder="e.g. APEX"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.shortName && <p className="text-xs text-red-500 mt-1">{errors.shortName}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g. Empowering Next Generation Leaders"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Primary Color Picker & Live Contrast Warning */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Primary Brand Color (Strict Hex #RRGGBB)
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="color"
                value={primarySanitized}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="h-10 w-16 p-1 border border-slate-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                placeholder="#0ea5e9"
                className="w-36 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg uppercase"
              />

              {/* Contrast Indicator Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  contrastInfo.contrast >= 4.5
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {contrastInfo.contrast >= 4.5 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>WCAG AA Passed ({contrastInfo.contrast}:1)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Low Contrast ({contrastInfo.contrast}:1) - Auto-adjusted to {contrastInfo.color}</span>
                  </>
                )}
              </div>

              {/* Live Button Preview */}
              <div
                style={{
                  backgroundColor: contrastInfo.color,
                  color: contrastInfo.foreground,
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold shadow-xs select-none"
              >
                Button Preview
              </div>
            </div>
            {errors.primaryColor && <p className="text-xs text-red-500 mt-1">{errors.primaryColor}</p>}
          </div>

          <hr className="border-border" />

          {/* Logo & Favicon Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Center Logo (PNG, JPG, WEBP • Max 2 MB)
              </label>

              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border border-border bg-surface-hover/50 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">No logo</span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'logo');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface border border-border text-foreground rounded-lg hover:bg-surface-hover cursor-pointer shadow-sm"
                  >
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload Logo
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('logoUrl', null)}
                      className="block text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Browser Favicon (Square PNG, ICO • Max 2 MB)
              </label>

              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl border border-border bg-surface-hover/50 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.faviconUrl ? (
                    <img src={formData.faviconUrl} alt="Favicon preview" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">Default</span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/x-icon"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'favicon');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface border border-border text-foreground rounded-lg hover:bg-surface-hover cursor-pointer shadow-sm"
                  >
                    {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload Favicon
                  </button>
                  {formData.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('faviconUrl', null)}
                      className="block text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Remove favicon
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contact & Socials */}
      {activeTab === 'contact' && (
        <div className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone *
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="+8801700000000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.contactPhone && <p className="text-xs text-red-500 mt-1">{errors.contactPhone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Hotline
              </label>
              <input
                type="tel"
                value={formData.whatsapp || ''}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="+8801700000000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Campus / Head Office Address
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="House 42, Road 11, Banani, Dhaka-1213"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Social Media Links (HTTPS Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Facebook Page</label>
                <input
                  type="url"
                  value={formData.socials?.facebook || ''}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/yourcoaching"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">YouTube Channel</label>
                <input
                  type="url"
                  value={formData.socials?.youtube || ''}
                  onChange={(e) => handleSocialChange('youtube', e.target.value)}
                  placeholder="https://youtube.com/@yourcoaching"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={formData.socials?.linkedin || ''}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcoaching"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Instagram Profile</label>
                <input
                  type="url"
                  value={formData.socials?.instagram || ''}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/yourcoaching"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Official Website</label>
                <input
                  type="url"
                  value={formData.socials?.website || ''}
                  onChange={(e) => handleSocialChange('website', e.target.value)}
                  placeholder="https://yourcoaching.edu.bd"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Locale & Currency */}
      {activeTab === 'locale' && (
        <div className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Currency Code (ISO) *
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                placeholder={DEFAULT_CURRENCY}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Currency Symbol *
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                placeholder={DEFAULT_CURRENCY_SYMBOL}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Timezone *
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Language
              </label>
              <select
                value={formData.defaultLocale}
                onChange={(e) => handleChange('defaultLocale', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
              >
                <option value="en">English (en)</option>
                <option value="bn">Bangla (bn)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Academic Year Start Month
              </label>
              <select
                value={formData.academicYearStartMonth || 1}
                onChange={(e) => handleChange('academicYearStartMonth', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
              >
                <option value={1}>January (Month 1)</option>
                <option value={6}>June (Month 6)</option>
                <option value={7}>July (Month 7)</option>
                <option value={9}>September (Month 9)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Week Starts On *
              </label>
              <select
                id="weekStartsOnSelect"
                value={formData.weekStartsOn ?? 6}
                onChange={(e) => handleChange('weekStartsOn', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
              >
                <option value={6}>Saturday (Default)</option>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Anchors calendar views, lecture schedule headers, and weekly academic aggregates.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Monthly Fee Due Day (1–28) *
              </label>
              <input
                id="feeDueDayInput"
                type="number"
                min="1"
                max="28"
                value={formData.feeDueDay ?? 10}
                onChange={(e) =>
                  handleChange('feeDueDay', Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Monthly fees are billed with due date on day {formData.feeDueDay ?? 10} of the billing month.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Receipts */}
      {activeTab === 'receipts' && (
        <div className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Receipt / Invoice Header Note
            </label>
            <textarea
              rows={3}
              value={formData.receiptHeader || ''}
              onChange={(e) => handleChange('receiptHeader', e.target.value)}
              placeholder="e.g. Official Student Payment Receipt — Please retain for admission verification."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Appears at the top of printed/downloaded payment receipts.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Receipt / Invoice Footer Note
            </label>
            <textarea
              rows={3}
              value={formData.receiptFooter || ''}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="e.g. Fees once paid are non-refundable. For accounts inquiries: accounts@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Appears at the bottom of student fee receipts and vouchers.</p>
          </div>
        </div>
      )}

      {/* Tab 5: Feature Flags */}
      {activeTab === 'features' && (
        <div className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <p className="text-xs text-muted-foreground mb-2">
            Enable or disable public and auxiliary modules. Disabled features are hidden across the interface and API routes return 404.
          </p>

          <div className="divide-y divide-border">
            {/* Public Website */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Public Website (Landing & Explore)</h4>
                <p className="text-xs text-muted-foreground">
                  When disabled, visitors to &quot;/&quot; are redirected to the Login page and the public navbar collapses to &quot;Log in&quot;.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.publicSite !== false}
                onChange={(e) => handleFeatureToggle('publicSite', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* AI Assistant */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">AI Academic Assistant</h4>
                <p className="text-xs text-muted-foreground">
                  Enables student practice sessions and AI study tools powered by Google Gemini.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.aiAssistant !== false}
                onChange={(e) => handleFeatureToggle('aiAssistant', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Blog */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Academic Blog & Articles</h4>
                <p className="text-xs text-muted-foreground">
                  Enables the public /blog section and article publishing from the dashboard.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.blog !== false}
                onChange={(e) => handleFeatureToggle('blog', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Student Reviews */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Batch Reviews & Ratings</h4>
                <p className="text-xs text-muted-foreground">
                  Allows enrolled students to rate and review their batches.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.reviews !== false}
                onChange={(e) => handleFeatureToggle('reviews', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Testimonials */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Alumni Testimonials</h4>
                <p className="text-xs text-muted-foreground">
                  Displays success stories and alumni testimonials on landing pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.testimonials !== false}
                onChange={(e) => handleFeatureToggle('testimonials', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Newsletter */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Newsletter Subscription</h4>
                <p className="text-xs text-muted-foreground">
                  Enables the newsletter subscription input in the footer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.newsletter !== false}
                onChange={(e) => handleFeatureToggle('newsletter', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Show Powered By EduFlow */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Show &quot;Powered by EduFlow&quot; Credit</h4>
                <p className="text-xs text-muted-foreground">
                  Displays a subtle &quot;Powered by EduFlow&quot; attribution link in the website footer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.showPoweredBy !== false}
                onChange={(e) => handleFeatureToggle('showPoweredBy', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Lectures & Routine */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Lectures & Routine Planning</h4>
                <p className="text-xs text-muted-foreground">
                  Enables lecture planning, routine slot generation, lecture materials, and syllabus progress tracking.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.lectures !== false}
                onChange={(e) => handleFeatureToggle('lectures', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Assignments */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Assignments & Homework</h4>
                <p className="text-xs text-muted-foreground">
                  Enables online file/text submissions, offline marks entry grids, and teacher grading.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.assignments !== false}
                onChange={(e) => handleFeatureToggle('assignments', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Online Classes */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Online Classes & Meeting Links</h4>
                <p className="text-xs text-muted-foreground">
                  Enables Google Meet, Zoom, and live class links with automated 30-minute join-window gating.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features?.onlineClasses !== false}
                onChange={(e) => handleFeatureToggle('onlineClasses', e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Homepage Settings */}
      {activeTab === 'homepage' && (
        <div className="space-y-8">
          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700/60">
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <Eye className="h-3.5 w-3.5" /> Live Hero Preview
              </span>
              <span className="text-[11px] text-slate-400">
                {formData.homepage?.showFees !== false ? 'Fees: Displayed' : 'Fees: Hidden'}
              </span>
            </div>

            {formData.homepage?.heroBadge?.trim() && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/20 text-primary-200 border border-primary/30 rounded-full text-xs font-semibold">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{formData.homepage.heroBadge.trim()}</span>
              </div>
            )}

            {formData.homepage?.announcement?.enabled && formData.homepage?.announcement?.text && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary-200 border border-primary/30 rounded-full text-xs">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{formData.homepage.announcement.text}</span>
              </div>
            )}

            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {formData.homepage?.heroTitle?.trim() || formData.name || 'Your Coaching Center'}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {formData.homepage?.heroSubtitle?.trim() ||
                  formData.tagline ||
                  'Structured coaching programs with expert educators, regular assessments, and student progress tracking.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm">
                Enquire now
              </span>
              <span className="px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/20">
                View courses
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                Student login / Go to dashboard
              </span>
            </div>

            {(formData.homepage?.heroPoints || []).filter((p) => p && p.trim()).length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-300">
                {(formData.homepage?.heroPoints || [])
                  .filter((p) => p && p.trim())
                  .map((pt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-primary" /> {pt}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Section 1: Hero Banner */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Hero Section</h3>
              <p className="text-xs text-muted-foreground">
                The primary banner greeting admission-seeking students and parents. Leave blank to default to center name and tagline.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Hero Badge (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {(formData.homepage?.heroBadge || '').length} / 40
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={formData.homepage?.heroBadge || ''}
                  onChange={(e) => handleHomepageChange('heroBadge', e.target.value)}
                  placeholder="e.g. Admissions Open • 2026 Batch"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Appears as a prominent pill badge directly above the hero title. Leave empty to omit.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hero Key Points (Optional • Up to 3 points, max 30 chars each)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const currentPoints = formData.homepage?.heroPoints || [];
                    const val = currentPoints[idx] || '';
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Point {idx + 1}</span>
                          <span>{val.length} / 30</span>
                        </div>
                        <input
                          type="text"
                          maxLength={30}
                          value={val}
                          onChange={(e) => {
                            const next = [...(formData.homepage?.heroPoints || ['', '', ''])];
                            while (next.length < 3) next.push('');
                            next[idx] = e.target.value;
                            handleHomepageChange('heroPoints', next);
                          }}
                          placeholder={
                            idx === 0
                              ? 'e.g. Structured Routine'
                              : idx === 1
                              ? 'e.g. Weekly Assessments'
                              : 'e.g. Attendance Tracking'
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Checklist highlights displayed under the hero action buttons. Empty points are omitted.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Hero Title
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {(formData.homepage?.heroTitle || '').length} / 90
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={90}
                  value={formData.homepage?.heroTitle || ''}
                  onChange={(e) => handleHomepageChange('heroTitle', e.target.value)}
                  placeholder={formData.name || 'e.g. Build Strong Foundations for Board & Entrance Exams'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Hero Subtitle
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {(formData.homepage?.heroSubtitle || '').length} / 220
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={220}
                  value={formData.homepage?.heroSubtitle || ''}
                  onChange={(e) => handleHomepageChange('heroSubtitle', e.target.value)}
                  placeholder={
                    formData.tagline ||
                    'e.g. Structured coaching programs with verified faculty, small batches, and transparent progress reports.'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hero Image (Optional • HTTPS URL or Upload)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="url"
                    value={formData.homepage?.heroImageUrl || ''}
                    onChange={(e) => handleHomepageChange('heroImageUrl', e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />

                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'hero');
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface border border-border text-foreground rounded-lg hover:bg-surface-hover cursor-pointer shrink-0 shadow-sm"
                  >
                    {uploadingHero ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Image
                  </button>

                  {formData.homepage?.heroImageUrl && (
                    <button
                      type="button"
                      onClick={() => handleHomepageChange('heroImageUrl', null)}
                      className="text-xs text-red-500 hover:underline cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {formData.homepage?.heroImageUrl && (
                  <div className="mt-3 h-28 w-48 rounded-lg overflow-hidden border border-border bg-surface-hover/50">
                    <img
                      src={formData.homepage.heroImageUrl}
                      alt="Hero banner preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Announcement Bar */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Announcement Bar</h3>
                <p className="text-xs text-muted-foreground">
                  Dismissible banner pinned across the very top of the homepage for admissions, scholarships, or notices.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.homepage?.announcement?.enabled === true}
                  onChange={(e) => handleAnnouncementChange('enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Announcement Text
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {(formData.homepage?.announcement?.text || '').length} / 160
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={160}
                  value={formData.homepage?.announcement?.text || ''}
                  onChange={(e) => handleAnnouncementChange('text', e.target.value)}
                  placeholder="e.g. Admissions Open for Academic Session 2026-2027 • Scholarship Test on Nov 15"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Link Label (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {(formData.homepage?.announcement?.linkLabel || '').length} / 40
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={formData.homepage?.announcement?.linkLabel || ''}
                  onChange={(e) => handleAnnouncementChange('linkLabel', e.target.value)}
                  placeholder="e.g. Register now"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link Destination URL (Relative or HTTPS)
                </label>
                <input
                  type="text"
                  value={formData.homepage?.announcement?.linkUrl || ''}
                  onChange={(e) => handleAnnouncementChange('linkUrl', e.target.value)}
                  placeholder="/explore or https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Highlights & Statistics */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Highlights & Statistics</h3>
                <p className="text-xs text-muted-foreground">
                  Key metrics displayed in the highlight strip below the hero (maximum 4 statistics).
                </p>
              </div>
              <button
                type="button"
                onClick={addHighlight}
                disabled={(formData.homepage?.highlights?.length || 0) >= 4}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Statistic
              </button>
            </div>

            {(!formData.homepage?.highlights || formData.homepage.highlights.length === 0) ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No highlights configured. The highlights strip will be hidden on the homepage.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.homepage.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-surface-hover/30 border border-border rounded-xl"
                  >
                    <div className="w-full sm:w-1/3">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Metric Value (e.g. 1,500+)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={item.value}
                        onChange={(e) => updateHighlight(idx, 'value', e.target.value)}
                        placeholder="1,500+"
                        className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                      />
                    </div>

                    <div className="w-full sm:flex-1">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Metric Label (e.g. Students enrolled)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={item.label}
                        onChange={(e) => updateHighlight(idx, 'label', e.target.value)}
                        placeholder="Students enrolled"
                        className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-1 pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => moveHighlight(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHighlight(idx, 'down')}
                        disabled={idx === (formData.homepage?.highlights?.length || 0) - 1}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHighlight(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Why Choose Us */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Why Choose Us</h3>
                <p className="text-xs text-muted-foreground">
                  Feature pillars with icons highlighting coaching strengths (maximum 6 items).
                </p>
              </div>
              <button
                type="button"
                onClick={addWhyChooseUs}
                disabled={(formData.homepage?.whyChooseUs?.length || 0) >= 6}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Feature
              </button>
            </div>

            {(!formData.homepage?.whyChooseUs || formData.homepage.whyChooseUs.length === 0) ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No &quot;Why Choose Us&quot; items configured. The section will be hidden on the homepage.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.homepage.whyChooseUs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-surface-hover/30 border border-border rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Feature #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveWhyChooseUs(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveWhyChooseUs(idx, 'down')}
                          disabled={idx === (formData.homepage?.whyChooseUs?.length || 0) - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWhyChooseUs(idx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer ml-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Title ({item.title.length}/60)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={item.title}
                          onChange={(e) => updateWhyChooseUs(idx, 'title', e.target.value)}
                          placeholder="e.g. Expert Faculty"
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Icon
                        </label>
                        <select
                          value={item.icon}
                          onChange={(e) => updateWhyChooseUs(idx, 'icon', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                        >
                          {WHITELISTED_ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Description ({item.description.length}/220)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={220}
                          value={item.description}
                          onChange={(e) => updateWhyChooseUs(idx, 'description', e.target.value)}
                          placeholder="e.g. Learn directly from top university graduates and seasoned subject specialists."
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Admission Steps */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Admission Steps</h3>
                <p className="text-xs text-muted-foreground">
                  How admission works, guiding prospective students step-by-step (maximum 5 steps).
                </p>
              </div>
              <button
                type="button"
                onClick={addAdmissionStep}
                disabled={(formData.homepage?.admissionSteps?.length || 0) >= 5}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </button>
            </div>

            {(!formData.homepage?.admissionSteps || formData.homepage.admissionSteps.length === 0) ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No admission steps configured. The section will be hidden on the homepage.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.homepage.admissionSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-surface-hover/30 border border-border rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Step {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveAdmissionStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAdmissionStep(idx, 'down')}
                          disabled={idx === (formData.homepage?.admissionSteps?.length || 0) - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAdmissionStep(idx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer ml-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Step Title ({step.title.length}/60)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={step.title}
                          onChange={(e) => updateAdmissionStep(idx, 'title', e.target.value)}
                          placeholder="e.g. Choose Your Course & Branch"
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Step Description ({step.description.length}/220)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={220}
                          value={step.description}
                          onChange={(e) => updateAdmissionStep(idx, 'description', e.target.value)}
                          placeholder="e.g. Browse active batches and pick your preferred campus timing."
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border text-foreground rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Section Toggles */}
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card space-y-4">
            <h3 className="text-base font-bold text-foreground border-b border-border pb-3">
              Section Visibility & Display Toggles
            </h3>

            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Show Course Fees</h4>
                  <p className="text-xs text-muted-foreground">
                    When enabled, course fees are displayed on homepage batch cards and explore pages. When disabled, fees are hidden and replaced with &quot;Contact for fee&quot;.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.homepage?.showFees !== false}
                  onChange={(e) => handleHomepageChange('showFees', e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Show Photo Gallery</h4>
                  <p className="text-xs text-muted-foreground">
                    Display campus life, classroom, and activity photos if gallery images are available.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.homepage?.showPhotoGallery !== false}
                  onChange={(e) => handleHomepageChange('showPhotoGallery', e.target.checked)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Pages & Legal Overrides */}
      {activeTab === 'pages' && (
        <PagesSettingsTab
          formData={formData}
          setFormData={setFormData}
          errors={errors}
        />
      )}
    </div>
  );
}
