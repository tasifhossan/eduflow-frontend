'use client';

import * as React from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  RotateCcw,
  Video,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { apiPost, apiPatch } from '@/lib/api';
import { getUploadLimits, uploadToCloudinary, UploadLimits } from '@/lib/upload';
import { useCenter } from '@/components/providers/center-provider';
import { toast } from 'sonner';

export type StudyMaterialType =
  | 'PREPARATION'
  | 'NOTES'
  | 'SLIDES'
  | 'PRACTICE'
  | 'QUESTIONS'
  | 'REFERENCE'
  | 'RECORDING'
  | 'OTHER';

export const MATERIAL_TYPE_LABELS: Record<StudyMaterialType, string> = {
  PREPARATION: 'Preparation (Before Class)',
  NOTES: 'Class Notes',
  SLIDES: 'Lecture Slides',
  PRACTICE: 'Practice Sheets',
  QUESTIONS: 'Questions Bank',
  REFERENCE: 'Reference Material',
  RECORDING: 'Class Recording Link',
  OTHER: 'Other Material',
};

export interface MaterialAttachmentInput {
  id?: string;
  kind: 'FILE' | 'LINK';
  title: string;
  url?: string | null;
  publicId?: string | null;
  resourceType?: string | null;
  format?: string | null;
  bytes?: number | null;
  originalName?: string | null;
}

export interface MaterialItemData {
  id?: string;
  batchId: string;
  chapterId?: string | null;
  lectureId?: string | null;
  title: string;
  description?: string | null;
  type: StudyMaterialType;
  availableFrom?: string | null;
  isPublished?: boolean;
  attachments?: MaterialAttachmentInput[];
}

export interface MaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  chapters: Array<{ id: string; name?: string; title?: string }>;
  lectures?: Array<{ id: string; title: string }>;
  initialMaterial?: MaterialItemData | null;
  preselectedChapterId?: string | null;
  preselectedLectureId?: string | null;
  onSaved: () => void;
}

interface UploadingFileState {
  file: File;
  title: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  abortController?: AbortController;
  result?: {
    publicId: string;
    resourceType?: string;
    format?: string;
    bytes?: number;
    originalName?: string;
  };
}

export function MaterialDialog({
  isOpen,
  onClose,
  batchId,
  chapters,
  lectures = [],
  initialMaterial,
  preselectedChapterId,
  preselectedLectureId,
  onSaved,
}: MaterialDialogProps) {
  const { center } = useCenter();
  const tz = center?.timezone || 'Asia/Dhaka';

  const isEditing = Boolean(initialMaterial?.id);

  const [title, setTitle] = React.useState(() => initialMaterial?.title || '');
  const [description, setDescription] = React.useState(() => initialMaterial?.description || '');
  const [type, setType] = React.useState<StudyMaterialType>(() => initialMaterial?.type || 'PREPARATION');
  const [chapterId, setChapterId] = React.useState<string>(() => initialMaterial?.chapterId || preselectedChapterId || '');
  const [lectureId, setLectureId] = React.useState<string>(() => initialMaterial?.lectureId || preselectedLectureId || '');
  const [availableFrom, setAvailableFrom] = React.useState<string>(() => {
    if (!initialMaterial?.availableFrom) return '';
    const d = new Date(initialMaterial.availableFrom);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });
  const [notify, setNotify] = React.useState(false);

  // File attachments & upload state
  const [limits, setLimits] = React.useState<UploadLimits | null>(null);
  const [existingAttachments, setExistingAttachments] = React.useState<MaterialAttachmentInput[]>(() => initialMaterial?.attachments || []);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFileState[]>([]);

  // Links
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkTitle, setLinkTitle] = React.useState('');
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleClose = React.useCallback(() => {
    setUploadingFiles([]);
    setLinkUrl('');
    setLinkTitle('');
    setLinkError(null);
    setSubmitError(null);
    onClose();
  }, [onClose]);

  // Fetch upload limits on mount
  React.useEffect(() => {
    let mounted = true;
    getUploadLimits('material')
      .then((l) => {
        if (mounted) setLimits(l);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Total active attachments count
  const totalAttachmentsCount =
    existingAttachments.length +
    uploadingFiles.filter((f) => f.status !== 'error').length;

  const startUpload = (file: File, fileIndex: number) => {
    const controller = new AbortController();

    setUploadingFiles((prev) => {
      const copy = [...prev];
      if (copy[fileIndex]) {
        copy[fileIndex].status = 'uploading';
        copy[fileIndex].error = undefined;
        copy[fileIndex].progress = 0;
        copy[fileIndex].abortController = controller;
      }
      return copy;
    });

    uploadToCloudinary({
      purpose: 'material',
      file,
      signal: controller.signal,
      onProgress: (percent) => {
        setUploadingFiles((prev) => {
          const copy = [...prev];
          if (copy[fileIndex]) {
            copy[fileIndex].progress = percent;
          }
          return copy;
        });
      },
    })
      .then((res) => {
        setUploadingFiles((prev) => {
          const copy = [...prev];
          if (copy[fileIndex]) {
            copy[fileIndex].status = 'completed';
            copy[fileIndex].progress = 100;
            copy[fileIndex].result = {
              publicId: res.public_id,
              resourceType: res.resource_type,
              format: res.format,
              bytes: res.bytes,
              originalName: res.original_filename,
            };
          }
          return copy;
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setUploadingFiles((prev) => {
          const copy = [...prev];
          if (copy[fileIndex]) {
            copy[fileIndex].status = 'error';
            copy[fileIndex].error = err.message || 'Upload failed';
          }
          return copy;
        });
      });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (totalAttachmentsCount + files.length > 10) {
      toast.error('Maximum 10 attachments allowed per material item');
      return;
    }

    const currentLength = uploadingFiles.length;
    const newItems: UploadingFileState[] = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newItems]);

    // Kick off each upload
    newItems.forEach((item, idx) => {
      startUpload(item.file, currentLength + idx);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelUpload = (idx: number) => {
    const item = uploadingFiles[idx];
    if (item?.abortController) {
      item.abortController.abort();
    }
    setUploadingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingAttachment = (attId?: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleAddLink = (e: React.MouseEvent) => {
    e.preventDefault();
    setLinkError(null);

    const cleanUrl = linkUrl.trim();
    if (!cleanUrl) {
      setLinkError('URL is required');
      return;
    }
    if (!cleanUrl.startsWith('https://')) {
      setLinkError('Link URL must be a secure https:// link');
      return;
    }
    if (cleanUrl.length > 500) {
      setLinkError('Link URL cannot exceed 500 characters');
      return;
    }

    const cleanLabel = (linkTitle.trim() || cleanUrl).slice(0, 120);

    if (totalAttachmentsCount >= 10) {
      setLinkError('Maximum 10 attachments allowed per material item');
      return;
    }

    setExistingAttachments((prev) => [
      ...prev,
      {
        kind: 'LINK',
        title: cleanLabel,
        url: cleanUrl,
      },
    ]);

    setLinkUrl('');
    setLinkTitle('');
  };

  const handleSubmit = async (publishNow: boolean) => {
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError('Material title is required');
      return;
    }
    if (title.trim().length > 120) {
      setSubmitError('Title cannot exceed 120 characters');
      return;
    }
    if (description && description.length > 500) {
      setSubmitError('Description cannot exceed 500 characters');
      return;
    }

    // Check if any uploads are currently in progress
    const isUploadingAny = uploadingFiles.some((f) => f.status === 'uploading');
    if (isUploadingAny) {
      setSubmitError('Please wait for file uploads to finish before saving');
      return;
    }

    // Combine verified attachments
    const attachmentsPayload: MaterialAttachmentInput[] = [];

    // 1. Existing retained attachments
    for (const att of existingAttachments) {
      attachmentsPayload.push({
        kind: att.kind,
        title: att.title,
        url: att.kind === 'LINK' ? att.url : undefined,
        publicId: att.kind === 'FILE' ? att.publicId : undefined,
        resourceType: att.resourceType,
        format: att.format,
        bytes: att.bytes,
        originalName: att.originalName,
      });
    }

    // 2. Newly uploaded files
    for (const item of uploadingFiles) {
      if (item.status === 'completed' && item.result) {
        attachmentsPayload.push({
          kind: 'FILE',
          title: item.title.trim() || item.file.name,
          publicId: item.result.publicId,
          resourceType: item.result.resourceType,
          format: item.result.format,
          bytes: item.result.bytes,
          originalName: item.result.originalName,
        });
      }
    }

    if (attachmentsPayload.length > 10) {
      setSubmitError('Maximum 10 attachments allowed per material item');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        batchId,
        chapterId: chapterId || null,
        lectureId: lectureId || null,
        title: title.trim(),
        description: description.trim() || null,
        type,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
        attachments: attachmentsPayload,
      };

      if (isEditing) {
        payload.isPublished = publishNow;
        if (publishNow && notify) {
          payload.notify = true;
        }
        const res = await apiPatch(`/api/materials/${initialMaterial!.id}`, payload);
        if (res && res.success) {
          toast.success('Study material updated successfully');
          onSaved();
          onClose();
        } else {
          setSubmitError(res.message || 'Failed to update study material');
        }
      } else {
        payload.publish = publishNow;
        payload.notify = publishNow && notify;
        const res = await apiPost('/api/materials', payload);
        if (res && res.success) {
          toast.success(publishNow ? 'Study material published' : 'Study material saved as draft');
          onSaved();
          onClose();
        } else {
          setSubmitError(res.message || 'Failed to create study material');
        }
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred while saving material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Study Material' : 'Add Study Material'}
      description="Create preparation notes, slides, problem sheets, or video recordings for learners"
      maxWidth="lg"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto px-1 pr-2 custom-scrollbar">
        {submitError && (
          <div className="p-3 bg-status-danger-bg text-xs text-status-danger-text rounded-[var(--radius-control)] border border-status-danger-border flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="material-title" className="block text-xs font-semibold text-foreground mb-1">
            Material Title <span className="text-danger">*</span>
          </label>
          <input
            id="material-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Chapter 3 Calculus Preparation Sheet"
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{title.length}/120</p>
        </div>

        {/* Type & Chapter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="material-type" className="block text-xs font-semibold text-foreground mb-1">
              Material Type <span className="text-danger">*</span>
            </label>
            <select
              id="material-type"
              value={type}
              onChange={(e) => setType(e.target.value as StudyMaterialType)}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(Object.keys(MATERIAL_TYPE_LABELS) as StudyMaterialType[]).map((t) => (
                <option key={t} value={t}>
                  {MATERIAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="material-chapter" className="block text-xs font-semibold text-foreground mb-1">
              Target Chapter
            </label>
            <select
              id="material-chapter"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">General (No Chapter)</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title || ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Linked Lecture & Available From */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="material-lecture" className="block text-xs font-semibold text-foreground mb-1">
              Link to Lecture (Optional)
            </label>
            <select
              id="material-lecture"
              value={lectureId}
              onChange={(e) => setLectureId(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">None (Independent Material)</option>
              {lectures.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  {lec.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="material-available-from" className="block text-xs font-semibold text-foreground mb-1">
              Available From ({tz})
            </label>
            <input
              id="material-available-from"
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Learners cannot view or download this material until this time.
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="material-desc" className="block text-xs font-semibold text-foreground mb-1">
            Description / Instructions
          </label>
          <textarea
            id="material-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Key concepts covered, preparation tasks, or recommended exercises..."
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface text-foreground p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/500</p>
        </div>

        {/* Attachments Section */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface-hover/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Attachments ({totalAttachmentsCount}/10)</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload PDFs, slides, documents, images or attach secure web links.
              </p>
            </div>
            {totalAttachmentsCount < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs h-8"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Choose Files</span>
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={limits?.acceptString || '.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp'}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Video help notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-control)] bg-primary-subtle border border-border text-[11px] text-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              <strong>Video Note:</strong> Video recordings must be attached as external links (e.g. YouTube, Vimeo, Google Drive) below.
            </span>
          </div>

          {/* List of existing & uploading attachments */}
          {totalAttachmentsCount > 0 ? (
            <div className="space-y-2">
              {/* Existing attachments */}
              {existingAttachments.map((att, idx) => (
                <div
                  key={att.id || `att-${idx}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-[var(--radius-control)] border border-border bg-surface text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge variant={att.kind === 'FILE' ? 'secondary' : 'primary'} size="sm">
                      {att.kind}
                    </Badge>
                    <span className="font-medium text-foreground truncate">{att.title}</span>
                    {att.url && (
                      <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                        ({att.url})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingAttachment(att.id)}
                    aria-label={`Remove ${att.title}`}
                    className="h-7 w-7 rounded-[var(--radius-control)] hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}

              {/* Uploading files */}
              {uploadingFiles.map((item, idx) => (
                <div
                  key={`upload-${idx}`}
                  className="p-2.5 rounded-[var(--radius-control)] border border-border bg-surface text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                      <span className="font-medium text-foreground truncate">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({(item.file.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === 'uploading' && (
                        <span className="text-[11px] font-mono text-primary font-bold">{item.progress}%</span>
                      )}
                      {item.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
                      )}
                      {item.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => startUpload(item.file, idx)}
                          aria-label="Retry upload"
                          className="h-6 px-1.5 rounded text-[10px] bg-primary text-primary-foreground font-medium flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCancelUpload(idx)}
                        aria-label="Remove uploaded file"
                        className="h-6 w-6 rounded hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {item.status === 'uploading' && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === 'error' && (
                    <p className="text-[11px] text-danger">{item.error || 'Upload failed'}</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Add Web Link Form */}
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-foreground">Attach Secure Link</p>
            {linkError && (
              <p className="text-[11px] text-status-danger-text bg-status-danger-bg p-2 rounded border border-status-danger-border">
                {linkError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Link Label (e.g. Class Video Recording)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                maxLength={120}
                className="rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex-1 rounded-[var(--radius-control)] border border-border bg-surface text-foreground px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  disabled={totalAttachmentsCount >= 10 || !linkUrl.trim()}
                  className="h-8 text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>Add Link</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notify Checkbox */}
        <div className="p-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 flex items-start gap-2.5">
          <input
            id="notify-students"
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="notify-students" className="text-xs text-foreground cursor-pointer select-none">
            <span className="font-semibold">Notify enrolled students and linked guardians</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sends in-app notifications and email updates immediately upon publishing.
            </p>
          </label>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSubmit(false)}
          isLoading={submitting}
          className="border-border text-foreground"
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => handleSubmit(true)}
          isLoading={submitting}
        >
          {isEditing && initialMaterial?.isPublished ? 'Update & Publish' : 'Publish Now'}
        </Button>
      </div>
    </Modal>
  );
}
