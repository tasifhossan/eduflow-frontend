'use client';

import React, { useState } from 'react';
import { FullCenterSettings } from '@/lib/types/center';
import { SafeText } from '@/components/content/safe-text';
import {
  getDefaultPrivacyPolicy,
  getDefaultTermsOfService,
} from '@/components/legal/default-legal-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Clock,
  BookOpen,
  FileText,
  ShieldCheck,
  Plus,
  X,
  Eye,
  Edit3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export interface PagesSettingsTabProps {
  formData: FullCenterSettings;
  setFormData: React.Dispatch<React.SetStateAction<FullCenterSettings | null>>;
  errors: Record<string, string>;
}

export function PagesSettingsTab({
  formData,
  setFormData,
  errors,
}: PagesSettingsTabProps) {
  const [newFacility, setNewFacility] = useState('');
  const [previewPrivacy, setPreviewPrivacy] = useState(false);
  const [previewTerms, setPreviewTerms] = useState(false);
  const [previewAbout, setPreviewAbout] = useState(false);

  // Office hours
  const handleOfficeHoursChange = (val: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, officeHours: val };
    });
  };

  // About fields
  const handleAboutChange = (
    field: 'headline' | 'body' | 'mission' | 'vision',
    val: string
  ) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        about: {
          ...(prev.about || {}),
          [field]: val,
        },
      };
    });
  };

  const addFacility = () => {
    const val = newFacility.trim();
    if (!val) return;
    const current = formData.about?.facilities || [];
    if (current.length >= 8) return;
    if (val.length > 60) return;

    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        about: {
          ...(prev.about || {}),
          facilities: [...current, val],
        },
      };
    });
    setNewFacility('');
  };

  const removeFacility = (index: number) => {
    const current = (formData.about?.facilities || []).filter((_, i) => i !== index);
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        about: {
          ...(prev.about || {}),
          facilities: current,
        },
      };
    });
  };

  // Legal fields
  const handleLegalChange = (field: 'privacyText' | 'termsText', val: string | null) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        legal: {
          ...(prev.legal || {}),
          [field]: val,
        },
      };
    });
  };

  const useDefaultPrivacyTemplate = () => {
    const def = getDefaultPrivacyPolicy(formData);
    handleLegalChange('privacyText', def);
  };

  const clearPrivacy = () => {
    handleLegalChange('privacyText', null);
  };

  const useDefaultTermsTemplate = () => {
    const def = getDefaultTermsOfService(formData);
    handleLegalChange('termsText', def);
  };

  const clearTerms = () => {
    handleLegalChange('termsText', null);
  };

  // Character counts
  const officeHoursLen = formData.officeHours?.length || 0;
  const headlineLen = formData.about?.headline?.length || 0;
  const bodyLen = formData.about?.body?.length || 0;
  const missionLen = formData.about?.mission?.length || 0;
  const visionLen = formData.about?.vision?.length || 0;
  const privacyLen = formData.legal?.privacyText?.length || 0;
  const termsLen = formData.legal?.termsText?.length || 0;
  const facilities = formData.about?.facilities || [];

  return (
    <div className="space-y-8">
      {/* Section 1: Office Hours */}
      <Card className="p-6 bg-surface border-border shadow-card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Visiting &amp; Office Hours</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Displayed on the Contact page and footer to inform students and guardians when center offices are open for counseling.
        </p>

        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-foreground">Office Hours String</label>
            <span
              className={`font-mono text-[11px] ${
                officeHoursLen > 110 ? 'text-danger font-bold' : 'text-muted-foreground'
              }`}
            >
              {officeHoursLen} / 120
            </span>
          </div>
          <Input
            value={formData.officeHours || ''}
            onChange={(e) => handleOfficeHoursChange(e.target.value)}
            placeholder="e.g. Sat - Thu: 9:00 AM - 8:00 PM (Friday Closed)"
            maxLength={120}
            className="text-sm"
          />
          {errors.officeHours && (
            <p className="text-xs text-danger font-medium">{errors.officeHours}</p>
          )}
        </div>
      </Card>

      {/* Section 2: About Page Settings */}
      <Card className="p-6 bg-surface border-border shadow-card space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">About Page Content</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewAbout((prev) => !prev)}
            className="gap-1.5 text-xs h-8"
          >
            {previewAbout ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{previewAbout ? 'Edit Mode' : 'Live Preview'}</span>
          </Button>
        </div>

        {previewAbout ? (
          <div className="space-y-6 p-4 rounded-[var(--radius-control)] border border-border bg-surface-sunken/30">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider">Headline Preview</div>
              <h1 className="text-2xl font-extrabold text-foreground mt-1">
                {formData.about?.headline || 'No headline set (standard fallback will display)'}
              </h1>
            </div>
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Story Preview</div>
              <SafeText content={formData.about?.body || 'No story body set.'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-xs font-bold text-foreground mb-1">Mission</div>
                <p className="text-xs text-muted-foreground">{formData.about?.mission || 'Not specified'}</p>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground mb-1">Vision</div>
                <p className="text-xs text-muted-foreground">{formData.about?.vision || 'Not specified'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-foreground">Page Headline</label>
                <span
                  className={`font-mono text-[11px] ${
                    headlineLen > 80 ? 'text-danger font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {headlineLen} / 90
                </span>
              </div>
              <Input
                value={formData.about?.headline || ''}
                onChange={(e) => handleAboutChange('headline', e.target.value)}
                placeholder="e.g. Empowering Students for Academic and Admission Success"
                maxLength={90}
                className="text-sm"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-foreground">
                  About Story &amp; Narrative (Markdown supported)
                </label>
                <span
                  className={`font-mono text-[11px] ${
                    bodyLen > 3800 ? 'text-danger font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {bodyLen} / 4000
                </span>
              </div>
              <Textarea
                rows={6}
                value={formData.about?.body || ''}
                onChange={(e) => handleAboutChange('body', e.target.value)}
                placeholder="Write paragraphs separated by blank lines. Supports ## headings, - bullets, and **bold** text."
                maxLength={4000}
                className="text-sm font-mono text-xs"
              />
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-foreground">Mission Statement</label>
                  <span
                    className={`font-mono text-[11px] ${
                      missionLen > 370 ? 'text-danger font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {missionLen} / 400
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={formData.about?.mission || ''}
                  onChange={(e) => handleAboutChange('mission', e.target.value)}
                  placeholder="Core mission and goals of your coaching center..."
                  maxLength={400}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-foreground">Vision Statement</label>
                  <span
                    className={`font-mono text-[11px] ${
                      visionLen > 370 ? 'text-danger font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {visionLen} / 400
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={formData.about?.vision || ''}
                  onChange={(e) => handleAboutChange('vision', e.target.value)}
                  placeholder="Long-term vision for student development and quality..."
                  maxLength={400}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Facilities Tags (Up to 8) */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-foreground">
                  Campus Facilities (Up to 8)
                </label>
                <span className="text-muted-foreground">{facilities.length} / 8</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {facilities.map((fac, idx) => (
                  <Badge key={idx} variant="secondary" size="md" className="gap-1.5 py-1">
                    <span>{fac}</span>
                    <button
                      type="button"
                      onClick={() => removeFacility(idx)}
                      className="hover:text-danger p-0.5"
                      aria-label={`Remove facility ${fac}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {facilities.length < 8 && (
                <div className="flex gap-2 max-w-md">
                  <Input
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    placeholder="e.g. Air-Conditioned Classrooms"
                    maxLength={60}
                    className="h-9 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFacility();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFacility}
                    disabled={!newFacility.trim()}
                    className="h-9 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Section 3: Legal Policy Overrides */}
      <Card className="p-6 bg-surface border-border shadow-card space-y-8">
        <div className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Legal &amp; Compliance Overrides</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By default, honest institutional templates tailored to coaching centers in Bangladesh are rendered. You can customize them or populate the default text for editing.
          </p>
        </div>

        {/* Privacy Policy Block */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Privacy Policy Override</h3>
              {!formData.legal?.privacyText && (
                <Badge variant="neutral" size="sm">
                  Using Default Template
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useDefaultPrivacyTemplate}
                className="h-7 text-xs gap-1"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Use Default Template</span>
              </Button>
              {formData.legal?.privacyText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPrivacy}
                  className="h-7 text-xs text-danger hover:bg-danger/10 gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear (Use Default)</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewPrivacy((prev) => !prev)}
                className="h-7 text-xs gap-1"
              >
                {previewPrivacy ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{previewPrivacy ? 'Edit' : 'Preview'}</span>
              </Button>
            </div>
          </div>

          {previewPrivacy ? (
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-sunken/30 max-h-96 overflow-y-auto">
              <SafeText
                content={
                  formData.legal?.privacyText || getDefaultPrivacyPolicy(formData)
                }
              />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-end text-[11px] font-mono text-muted-foreground">
                <span className={privacyLen > 19000 ? 'text-danger font-bold' : ''}>
                  {privacyLen} / 20,000 chars
                </span>
              </div>
              <Textarea
                rows={8}
                value={formData.legal?.privacyText || ''}
                onChange={(e) => handleLegalChange('privacyText', e.target.value)}
                placeholder="Leave blank to use the standard center privacy policy template..."
                maxLength={20000}
                className="text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Terms of Service Block */}
        <div className="space-y-3 pt-6 border-t border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Terms of Service Override</h3>
              {!formData.legal?.termsText && (
                <Badge variant="neutral" size="sm">
                  Using Default Template
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useDefaultTermsTemplate}
                className="h-7 text-xs gap-1"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Use Default Template</span>
              </Button>
              {formData.legal?.termsText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearTerms}
                  className="h-7 text-xs text-danger hover:bg-danger/10 gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear (Use Default)</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewTerms((prev) => !prev)}
                className="h-7 text-xs gap-1"
              >
                {previewTerms ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{previewTerms ? 'Edit' : 'Preview'}</span>
              </Button>
            </div>
          </div>

          {previewTerms ? (
            <div className="p-4 rounded-[var(--radius-control)] border border-border bg-surface-sunken/30 max-h-96 overflow-y-auto">
              <SafeText
                content={
                  formData.legal?.termsText || getDefaultTermsOfService(formData)
                }
              />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-end text-[11px] font-mono text-muted-foreground">
                <span className={termsLen > 19000 ? 'text-danger font-bold' : ''}>
                  {termsLen} / 20,000 chars
                </span>
              </div>
              <Textarea
                rows={8}
                value={formData.legal?.termsText || ''}
                onChange={(e) => handleLegalChange('termsText', e.target.value)}
                placeholder="Leave blank to use the standard center terms of service template..."
                maxLength={20000}
                className="text-xs font-mono"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
