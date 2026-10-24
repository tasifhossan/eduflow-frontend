'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

const globalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute client cache

export interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
  ttl?: number;
  silentError?: boolean;
}

export function useApi<T>(url: string | null, options: UseApiOptions<T> = {}) {
  const { initialData, enabled = true, ttl = CACHE_TTL_MS, silentError = true } = options;
  const [data, setData] = useState<T | undefined>(() => {
    if (url && globalCache.has(url)) {
      const cached = globalCache.get(url)!;
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }
    return initialData;
  });
  const [loading, setLoading] = useState<boolean>(() => !data && Boolean(url && enabled));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Check memory cache
    if (globalCache.has(url)) {
      const cached = globalCache.get(url)!;
      if (Date.now() - cached.timestamp < ttl) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    apiGet<any>(url)
      .then((res) => {
        if (!isMounted) return;
        const resData = res?.data !== undefined ? res.data : res;
        globalCache.set(url, { data: resData, timestamp: Date.now() });
        setData(resData);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (!silentError) {
          setError(err);
        } else {
          console.warn(`[useApi] Failed to fetch ${url}:`, err.message || err);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url, enabled, ttl, silentError]);

  return { data, loading, error };
}
