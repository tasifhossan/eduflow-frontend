import { apiGet } from './api';

export interface UserClaims {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';
  branchId: string;
}

export async function getCurrentUserClient(): Promise<UserClaims | null> {
  try {
    const res = await apiGet<{ success: boolean; data: UserClaims }>('/api/auth/me');
    if (res?.success && res?.data) {
      return res.data;
    }
  } catch (error) {
    console.warn('GET /api/auth/me failed on client:', error);
  }
  return null;
}

// Deprecated client-side cookie helpers (kept for backwards compatibility if needed)
export function getToken(): string | null {
  return null;
}

export function parseJwt(_token: string): any {
  return null;
}
