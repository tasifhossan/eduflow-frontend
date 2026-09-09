import { cookies } from 'next/headers';
import { apiGet } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN' | 'SUPER_ADMIN';
  branchId: string;
}

export function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonString = typeof Buffer !== 'undefined'
      ? Buffer.from(base64, 'base64').toString('utf-8')
      : atob(base64);
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  const decoded = decodeJwtPayload(token);

  try {
    // Attempt to call backend /api/auth/me endpoint (forwarding the auth cookie)
    const response = await apiGet<{ success: boolean; data: User }>('/api/auth/me', {
      headers: {
        Cookie: `token=${token}`,
      },
    });
    if (response && response.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('GET /api/auth/me call failed in getCurrentUser, using JWT decoded payload fallback.');
  }

  if (decoded && (decoded.userId || decoded.id)) {
    return {
      id: decoded.userId || decoded.id,
      name: decoded.name || 'Logged In User',
      email: decoded.email || 'user@eduflow.com',
      role: decoded.role,
      branchId: decoded.branchId,
    };
  }

  return null;
}
