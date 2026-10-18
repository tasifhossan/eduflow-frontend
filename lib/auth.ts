import { cookies } from 'next/headers';
import { apiGet } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN' | 'SUPER_ADMIN';
  branchId: string;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonString =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf-8')
        : atob(base64);
    return JSON.parse(jsonString) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    // Call backend /api/auth/me endpoint (forwarding the auth cookie)
    const response = await apiGet<{ success: boolean; data: User }>('/api/auth/me', {
      headers: {
        Cookie: `token=${token}`,
      },
    });

    if (response && response.success && response.data) {
      return response.data;
    }
  } catch {
    // Fail closed: verification failed, unverified client tokens must never be trusted
    return null;
  }

  // Fail closed if response is invalid
  return null;
}
