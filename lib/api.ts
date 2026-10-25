export class ApiError extends Error {
  status: number;
  data?: unknown;
  retryAfter?: number;

  constructor(message: string, status: number, data?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: unknown;
}

const getBaseUrl = () => {
  // In client browser, ALWAYS use relative path "" so requests go through Next.js proxy rewrite /api/*
  // This guarantees 1st-party httpOnly cookie storage on Vercel frontend domain regardless of env vars.
  if (typeof window !== 'undefined') {
    return '';
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    return raw.replace(/\/api$/, '');
  }
  return 'https://eduflow-backend-eu3i.onrender.com';
};

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      error?: string;
      errors?: unknown;
    };

    if (
      response.status === 403 &&
      errorData.code === 'PASSWORD_CHANGE_REQUIRED' &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/change-password')
    ) {
      window.location.href = '/change-password';
    }

    const errorMessage =
      errorData.message ||
      errorData.error ||
      `Request to ${path} failed with status ${response.status}`;
    const retryHeader = response.headers.get('retry-after');
    const parsedRetry = retryHeader ? parseInt(retryHeader, 10) : undefined;
    const retryAfter = parsedRetry !== undefined && !Number.isNaN(parsedRetry) ? parsedRetry : undefined;
    throw new ApiError(errorMessage, response.status, errorData, retryAfter);
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T = ApiResponse>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  return handleResponse<T>(response, path);
}

export async function apiPost<T = ApiResponse>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response, path);
}

export async function apiDelete<T = ApiResponse>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  return handleResponse<T>(response, path);
}

export async function apiPatch<T = ApiResponse>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response, path);
}

export async function apiPut<T = ApiResponse>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response, path);
}
