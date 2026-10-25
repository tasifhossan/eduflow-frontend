import { apiPost } from './api';

export interface UploadSignatureResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
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

const EXTENSION_MAP: Record<string, string[]> = {
  material: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'png', 'jpg', 'jpeg', 'webp', 'mp3', 'm4a'],
  submission: ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp'],
  branding: ['png', 'jpg', 'jpeg', 'webp'],
};

const MAX_BYTES_MAP: Record<string, number> = {
  material: 15 * 1024 * 1024, // 15MB
  submission: 10 * 1024 * 1024, // 10MB
  branding: 2 * 1024 * 1024, // 2MB
};

export async function uploadToCloudinary({
  purpose,
  file,
  onProgress,
  signal,
}: UploadOptions): Promise<CloudinaryUploadResult> {
  // 1. Client-side format & size validation
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowed = EXTENSION_MAP[purpose] || [];
  if (!allowed.includes(ext)) {
    throw new Error(`File format .${ext} is not allowed. Allowed formats: ${allowed.join(', ')}`);
  }

  const maxBytes = MAX_BYTES_MAP[purpose] || 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${mb}MB`);
  }

  // 2. Request upload signature from backend
  const sigRes = await apiPost<{ success: boolean; data: UploadSignatureResponse }>(
    '/api/uploads/signature',
    { purpose }
  );

  if (!sigRes?.success || !sigRes.data) {
    throw new Error('Failed to obtain authenticated upload signature from server');
  }

  const { signature, timestamp, apiKey, cloudName, folder } = sigRes.data;

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
