import { CenterPublicData, defaultCenterData } from './types/center';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Server-side fetcher for center configuration with 300s cache revalidation.
 * Falls back gracefully to neutral defaultCenterData if the API is offline.
 */
export async function getCenterData(): Promise<CenterPublicData> {
  try {
    const res = await fetch(`${API_BASE}/api/public/center`, {
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[getCenterData] Failed to fetch center settings (${res.status}), using default fallback.`);
      return defaultCenterData;
    }

    const json = await res.json();
    if (json.success && json.data) {
      return {
        ...defaultCenterData,
        ...json.data,
        features: {
          ...defaultCenterData.features,
          ...(json.data.features || {}),
        },
      };
    }

    return defaultCenterData;
  } catch (err) {
    // If backend is stopped or unreachable, smoothly fallback to neutral portal
    return defaultCenterData;
  }
}
