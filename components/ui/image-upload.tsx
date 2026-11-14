'use client';

import * as React from 'react';
import Image from 'next/image';
import { Upload, X, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUploadLimits, uploadToCloudinary, UploadLimits } from '@/lib/upload';
import { cn } from '@/lib/cn';

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  error?: string;
  aspectRatio?: 'video' | 'square' | 'avatar';
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Image',
  error: externalError,
  aspectRatio = 'video',
  className,
  disabled = false,
}: ImageUploadProps) {
  const [limits, setLimits] = React.useState<UploadLimits | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [internalError, setInternalError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let mounted = true;
    getUploadLimits('content')
      .then((l) => {
        if (mounted) setLimits(l);
      })
      .catch(() => {
        // Fallback default
        if (mounted) {
          setLimits({
            allowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
            maxBytes: 2 * 1024 * 1024,
            maxMb: 2,
            acceptString: '.png,.jpg,.jpeg,.webp',
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    setInternalError(null);
    setSelectedFile(file);

    // Client-side extension check
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = limits?.allowedFormats || ['png', 'jpg', 'jpeg', 'webp'];
    if (!allowed.includes(ext)) {
      setInternalError(`Format .${ext || 'unknown'} not supported. Allowed formats: ${allowed.join(', ')}`);
      return;
    }

    // Client-side size check
    const maxBytes = limits?.maxBytes || 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      const mb = (maxBytes / (1024 * 1024)).toFixed(0);
      setInternalError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${mb}MB.`);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadToCloudinary({
        purpose: 'content',
        file,
        signal: controller.signal,
        onProgress: (pct) => setProgress(pct),
      });

      if (result.secure_url) {
        onChange(result.secure_url);
        setInternalError(null);
      } else {
        throw new Error('Upload completed but secure URL was not returned.');
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setInternalError('Upload was cancelled.');
      } else {
        const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setInternalError(msg);
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      startUpload(selectedFile);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setInternalError(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectClass =
    aspectRatio === 'avatar'
      ? 'h-24 w-24 rounded-full'
      : aspectRatio === 'square'
      ? 'aspect-square max-w-[200px]'
      : 'aspect-[16/9] w-full max-w-md';

  const effectiveError = internalError || externalError;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <span className="block text-xs font-semibold text-foreground">
          {label}
        </span>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={limits?.acceptString || '.png,.jpg,.jpeg,.webp'}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="sr-only"
        id={`image-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />

      {/* Existing image preview */}
      {value && !isUploading && (
        <div className="relative group inline-block">
          <div
            className={cn(
              'relative overflow-hidden border border-border bg-muted shadow-sm',
              aspectClass,
              aspectRatio === 'avatar' ? 'rounded-full' : 'rounded-[var(--radius-control)]'
            )}
          >
            <Image
              src={value}
              alt={label}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover"
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove image"
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-surface border border-border text-foreground hover:bg-danger-subtle hover:text-danger hover:border-danger flex items-center justify-center shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Uploading progress state */}
      {isUploading && (
        <div
          className={cn(
            'flex flex-col items-center justify-center p-4 border border-border bg-surface-hover/30 text-center space-y-2',
            aspectClass,
            aspectRatio === 'avatar' ? 'rounded-full' : 'rounded-[var(--radius-control)]'
          )}
        >
          <Loader2 className="h-5 w-5 text-primary animate-spin" aria-hidden="true" />
          <span className="text-xs font-medium text-foreground">
            Uploading... {progress}%
          </span>
          <div className="w-full max-w-[140px] bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="text-xs h-7 px-2"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Idle upload picker when no image */}
      {!value && !isUploading && (
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/60 bg-surface hover:bg-surface-hover/40 transition-colors cursor-pointer text-center p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              aspectClass,
              aspectRatio === 'avatar' ? 'rounded-full' : 'rounded-[var(--radius-control)]',
              disabled && 'opacity-60 cursor-not-allowed hover:border-border hover:bg-surface'
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground mb-1.5" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">
              Choose an image
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              PNG, JPG, WebP (Max {limits?.maxMb ?? 2} MB)
            </span>
          </button>
        </div>
      )}

      {/* Error state with retry */}
      {effectiveError && (
        <div className="flex items-center gap-2 text-xs text-danger mt-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{effectiveError}</span>
          {selectedFile && !isUploading && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
