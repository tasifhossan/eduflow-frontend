export type ServerApiResult<T> =
  | { ok: true; data: T; notFound?: never; failed?: never }
  | { ok: false; notFound: true; data?: never; failed?: never }
  | { ok: false; failed: true; error: string; data?: never; notFound?: never };

export function getServerBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    return raw.replace(/\/api$/, '');
  }
  return 'http://localhost:5000';
}

/**
 * Server-side fetcher with 8-second timeout and 300s cache revalidation on success.
 * Resolves against backend base URL with zero production fallback.
 * A failed backend call is never cached as empty data.
 */
export async function serverFetch<T>(
  path: string,
  options?: {
    revalidate?: number;
    tags?: string[];
  }
): Promise<ServerApiResult<T>> {
  const baseUrl = getServerBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;
  const revalidate = options?.revalidate ?? 300;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate },
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (res.status === 404) {
      return { ok: false, notFound: true };
    }

    if (!res.ok) {
      return { ok: false, failed: true, error: `Backend returned status ${res.status}` };
    }

    const json = await res.json().catch(() => null);
    if (!json || json.success === false) {
      return { ok: false, failed: true, error: json?.message || 'Invalid response format' };
    }

    const data = (json.data !== undefined ? json.data : json) as T;
    return { ok: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error or timeout';
    return { ok: false, failed: true, error: errorMsg };
  }
}
