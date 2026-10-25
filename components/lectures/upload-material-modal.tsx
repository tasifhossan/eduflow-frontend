'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';
import { Upload, Link as LinkIcon, X, RotateCcw, FileText } from 'lucide-react';

export interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAttachment: unknown) => void;
  lectureId?: string;
  assignmentId?: string;
}

export function UploadMaterialModal({
  isOpen,
  onClose,
  onSuccess,
  lectureId,
  assignmentId,
}: UploadMaterialModalProps) {
  const [tab, setTab] = React.useState<'FILE' | 'LINK'>('FILE');

  // File state
  const [file, setFile] = React.useState<File | null>(null);
  const [fileTitle, setFileTitle] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Link state
  const [linkTitle, setLinkTitle] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [isSubmittingLink, setIsSubmittingLink] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!fileTitle) {
        setFileTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setProgress(0);
      toast.info('Upload cancelled');
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const cloudRes = await uploadToCloudinary({
        purpose: 'material',
        file,
        onProgress: (p) => setProgress(p),
        signal: abortControllerRef.current.signal,
      });

      // Save attachment in database
      const attPayload = {
        lectureId: lectureId || undefined,
        assignmentId: assignmentId || undefined,
        kind: 'FILE',
        title: fileTitle.trim() || file.name,
        publicId: cloudRes.public_id,
        format: cloudRes.format || file.name.split('.').pop()?.toLowerCase(),
        bytes: cloudRes.bytes || file.size,
        originalName: cloudRes.original_filename || file.name,
        resourceType: cloudRes.resource_type || 'raw',
      };

      const res = await apiPost<{ success: boolean; data: unknown }>('/api/attachments', attPayload);
      if (res?.success && res.data) {
        toast.success('Material file uploaded successfully');
        onSuccess(res.data);
        resetState();
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;

    if (!linkUrl.startsWith('https://')) {
      toast.error('Only secure HTTPS URLs are permitted');
      return;
    }

    setIsSubmittingLink(true);
    try {
      const res = await apiPost<{ success: boolean; data: unknown }>('/api/attachments', {
        lectureId: lectureId || undefined,
        assignmentId: assignmentId || undefined,
        kind: 'LINK',
        title: linkTitle.trim() || 'Resource Link',
        url: linkUrl.trim(),
      });

      if (res?.success && res.data) {
        toast.success('Link added successfully');
        onSuccess(res.data);
        resetState();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save link';
      toast.error(msg);
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setFileTitle('');
    setProgress(0);
    setUploadError(null);
    setLinkTitle('');
    setLinkUrl('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Learning Material"
      description="Attach documents, lecture slides, worksheets, or web links for students"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setTab('FILE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'FILE'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('LINK')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'LINK'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Link</span>
          </button>
        </div>

        {tab === 'FILE' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Material Title *</label>
              <Input
                placeholder="e.g. Chapter 4 Lecture Notes & Practice Problems"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {!file ? (
              <label className="flex flex-col items-center justify-center p-6 rounded-[var(--radius-card)] border-2 border-dashed border-border hover:border-primary/50 bg-surface-hover/30 hover:bg-surface-hover/50 cursor-pointer transition-colors text-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
                <span className="text-xs font-semibold text-foreground">
                  Click to select file or drag and drop
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  PDF, DOCX, PPTX, XLSX, ZIP, Images, Audio (Max 15MB)
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp,.mp3,.m4a"
                />
              </label>
            ) : (
              <div className="p-3.5 rounded-[var(--radius-card)] border border-border bg-surface flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove file"
                    className="p-1 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading to private cloud storage...</span>
                  <span className="font-semibold text-foreground">{progress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full bg-muted rounded-[var(--radius-pill)] h-2 overflow-hidden"
                >
                  <div
                    className="bg-primary h-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div
                role="alert"
                className="p-3 rounded-[var(--radius-control)] border border-danger/30 bg-danger-subtle text-danger text-xs flex items-center justify-between gap-2"
              >
                <span>{uploadError}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUploadFile}
                  className="text-xs text-danger hover:bg-danger/10 gap-1 h-7"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Retry</span>
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              {isUploading ? (
                <Button type="button" variant="outline" size="sm" onClick={handleCancelUpload}>
                  Cancel Upload
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!file || !fileTitle.trim()}
                    onClick={handleUploadFile}
                  >
                    Start Upload
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveLink} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Link Title *</label>
              <Input
                placeholder="e.g. Formula Sheet / External Reading"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">URL (Must start with https://) *</label>
              <Input
                type="url"
                placeholder="https://drive.google.com/... or https://khanacademy.org/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmittingLink}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingLink || !linkUrl.trim()}>
                {isSubmittingLink ? 'Adding...' : 'Add Link'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
