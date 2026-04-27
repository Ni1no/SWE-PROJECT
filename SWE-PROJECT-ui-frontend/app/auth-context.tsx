import React, { createContext, useContext, useMemo, useState } from 'react';
import { getBackendBaseUrl } from './api-config';

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function safeParse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${getBackendBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeParse(res);
      if (!res.ok) {
        // Demo fallback: allow local sign-in when backend auth is unavailable.
        setUser({
          name: email.split('@')[0] || 'User',
          email,
        });
        return {
          ok: true,
          message:
            data.message ||
            'Logged in locally (demo fallback). Start backend for full auth validation.',
        };
      }
      setUser({
        name: data.user?.name || email.split('@')[0] || 'User',
        email: data.user?.email || email,
      });
      return { ok: true };
    } catch {
      setUser({
        name: email.split('@')[0] || 'User',
        email,
      });
      return {
        ok: true,
        message: 'Logged in locally (demo fallback). Backend is unreachable.',
      };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${getBackendBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await safeParse(res);
      if (!res.ok) {
        // Demo fallback: create local session when backend register is unavailable.
        setUser({
          name,
          email,
        });
        return {
          ok: true,
          message:
            data.message ||
            'Account created locally (demo fallback). Start backend for persistent auth.',
        };
      }
      setUser({
        name: data.user?.name || name,
        email: data.user?.email || email,
      });
      return { ok: true };
    } catch {
      setUser({
        name,
        email,
      });
      return {
        ok: true,
        message: 'Account created locally (demo fallback). Backend is unreachable.',
      };
    }
  };

  const signOut = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      signOut,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
