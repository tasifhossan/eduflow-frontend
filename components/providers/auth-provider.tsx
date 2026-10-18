'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN';
  branchId?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: AuthUser | { user: AuthUser } }>('/api/auth/me');
      if (res && res.success && res.data) {
        const userData = 'user' in res.data ? res.data.user : res.data;
        setUser(userData as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function loadUser() {
      try {
        const res = await apiGet<{ success: boolean; data: AuthUser | { user: AuthUser } }>('/api/auth/me');
        if (!ignore) {
          if (res && res.success && res.data) {
            const userData = 'user' in res.data ? res.data.user : res.data;
            setUser(userData as AuthUser);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiPost('/api/auth/logout');
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/');
      router.refresh();
    } catch {
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/');
      router.refresh();
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
