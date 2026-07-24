import { cookies } from 'next/headers';
import { apiGet } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';
  branchId: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    // Attempt to call the real backend /api/auth/me endpoint (forwarding the auth cookie)
    const response = await apiGet<{ success: boolean; data: User }>('/api/auth/me', {
      headers: {
        Cookie: `token=${token}`,
      },
    });
    if (response && response.success && response.data) {
      return response.data;
    }
  } catch (error) {
    // If backend endpoint is missing/fails, fall back to decoding user info from the JWT token
    console.warn('GET /api/auth/me not available or failed, falling back to local JWT decode.');
  }

  // JWT Decoding Fallback
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const decoded = JSON.parse(jsonPayload);
      
      if (decoded && decoded.userId) {
        return {
          id: decoded.userId,
          name: 'Logged In User', // Mock name
          email: 'user@eduflow.com', // Mock email
          role: decoded.role,
          branchId: decoded.branchId,
        };
      }
    }
  } catch (e) {
    console.error('Failed to decode JWT locally:', e);
  }

  return null;
}
