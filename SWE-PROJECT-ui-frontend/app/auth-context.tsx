import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from './api-config';

export type AuthUser = {
  name: string;
  email: string;
};

const AUTH_TOKEN_KEY = 'ezcar:jwt';

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  updateProfile: (
    name: string,
    email: string
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteProfile: () => Promise<{ ok: boolean; message?: string }>;
  signOut: () => void;
  /** Send with backend requests that require JWT (e.g. /ai/chat). */
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function safeParse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(init || {}), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Product preference: always begin at login on app launch.
    // Clear any persisted token so sessions do not auto-restore.
    (async () => {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
    })();
  }, []);

  const getAccessToken = async () => AsyncStorage.getItem(AUTH_TOKEN_KEY);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetchWithTimeout(`${getBackendBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeParse(res);
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Invalid email or password.',
        };
      }
      if (data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, String(data.token));
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
        message:
          'Backend unreachable — signed in locally for demo. Start the Express server for real JWT auth.',
      };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetchWithTimeout(`${getBackendBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await safeParse(res);
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Could not create account.',
        };
      }
      if (data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, String(data.token));
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
        message:
          'Backend unreachable — created a local session for demo. Start the Express server for MongoDB + JWT registration.',
      };
    }
  };

  const updateProfile = async (name: string, email: string) => {
    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    if (!nextName || !nextEmail) {
      return { ok: false, message: 'Name and email are required.' };
    }
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, message: 'Please log in again.' };
    }

    try {
      const res = await fetchWithTimeout(`${getBackendBaseUrl()}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nextName, email: nextEmail }),
      });
      const data = await safeParse(res);
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Could not update profile.',
        };
      }
      if (data.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, String(data.token));
      }
      setUser({
        name: data.user?.name || nextName,
        email: data.user?.email || nextEmail,
      });
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Could not update profile. Check backend/API connection.',
      };
    }
  };

  const deleteProfile = async () => {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, message: 'Please log in again.' };
    }
    try {
      const res = await fetchWithTimeout(`${getBackendBaseUrl()}/auth/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await safeParse(res);
      if (!res.ok) {
        return {
          ok: false,
          message: data.message || 'Could not delete profile.',
        };
      }
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Could not delete profile. Check backend/API connection.',
      };
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      updateProfile,
      deleteProfile,
      signOut,
      getAccessToken,
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
