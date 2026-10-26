import { apiPost } from './api';

export interface UploadSignatureResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  type?: string;
  resourceType?: string;
  allowedFormats: string[];
  maxBytes: number;
}

export interface CloudinaryUploadResult {
  public_id: string;
  format?: string;
  bytes?: number;
  original_filename?: string;
  resource_type?: string;
  secure_url?: string;
}

export interface UploadOptions {
  purpose: 'material' | 'submission' | 'branding';
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploadLimits {
  allowedFormats: string[];
  maxBytes: number;
  maxMb: number;
  acceptString: string;
}

const limitsCache = new Map<string, Promise<UploadLimits>>();

/**
 * Fetches dynamic upload constraints from backend signature endpoint.
 * Zero hardcoded video/audio formats.
 */
export async function getUploadLimits(purpose: 'material' | 'submission' | 'branding'): Promise<UploadLimits> {
  const cached = limitsCache.get(purpose);
  if (cached) return cached;

  const fetchPromise = (async () => {
    try {
      const res = await apiPost<{ success: boolean; data: UploadSignatureResponse }>(
        '/api/uploads/signature',
        { purpose }
      );
      if (res?.success && res.data?.allowedFormats && res.data?.maxBytes) {
        const allowedFormats = res.data.allowedFormats;
        const maxBytes = res.data.maxBytes;
        return {
          allowedFormats,
          maxBytes,
          maxMb: Math.round(maxBytes / (1024 * 1024)),
          acceptString: allowedFormats.map((f) => `.${f}`).join(','),
        };
      }
    } catch (e) {
      console.warn('Failed to fetch dynamic upload limits, using defaults:', e);
    }

    // Secure fallback defaults without any video/audio
    const fallbackFormats =
      purpose === 'submission'
        ? ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp']
        : purpose === 'branding'
        ? ['png', 'jpg', 'jpeg', 'webp']
        : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'];
    const fallbackMax = purpose === 'submission' ? 10 * 1024 * 1024 : purpose === 'branding' ? 2 * 1024 * 1024 : 15 * 1024 * 1024;
    return {
      allowedFormats: fallbackFormats,
      maxBytes: fallbackMax,
      maxMb: Math.round(fallbackMax / (1024 * 1024)),
      acceptString: fallbackFormats.map((f) => `.${f}`).join(','),
    };
  })();

  limitsCache.set(purpose, fetchPromise);
  return fetchPromise;
}

export async function uploadToCloudinary({
  purpose,
  file,
  onProgress,
  signal,
}: UploadOptions): Promise<CloudinaryUploadResult> {
  // 1. Request dynamic signature and limits from backend
  const sigRes = await apiPost<{ success: boolean; data: UploadSignatureResponse }>(
    '/api/uploads/signature',
    { purpose }
  );

  if (!sigRes?.success || !sigRes.data) {
    throw new Error('Failed to obtain authenticated upload signature from server');
  }

  const { signature, timestamp, apiKey, cloudName, folder, allowedFormats, maxBytes } = sigRes.data;

  // 2. Validate client-side against backend constraints
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (allowedFormats && allowedFormats.length > 0 && !allowedFormats.includes(ext)) {
    throw new Error(
      `File format .${ext || 'unknown'} is not allowed. Allowed formats: ${allowedFormats.join(', ')}`
    );
  }

  const effectiveMaxBytes = maxBytes || 15 * 1024 * 1024;
  if (file.size > effectiveMaxBytes) {
    const mb = Math.round(effectiveMaxBytes / (1024 * 1024));
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${mb}MB`
    );
  }

  // 3. Prepare FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  // 4. Perform upload with XMLHttpRequest to support progress tracking and abort
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload aborted by user', 'AbortError'));
      });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json);
        } catch {
          reject(new Error('Invalid response from cloud storage'));
        }
      } else {
        try {
          const errJson = JSON.parse(xhr.responseText);
          reject(new Error(errJson.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload. Please check your connection and retry.'));
    });

    xhr.open('POST', endpoint);
    xhr.send(formData);
  });
}
