"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, clearTokens, getAccessToken, setTokens } from "./api";
import type { UserProfile } from "./types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (phone: string, password: string, fullName: string) => Promise<void>;
  registerComplete: (phone: string, password: string) => Promise<void>;
  telegramLogin: (data: Record<string, unknown>) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<UserProfile>("/auth/me/");
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await api.post<{ access: string; refresh: string; user: UserProfile }>(
        "/auth/login/",
        { identifier, password }
      );
      setTokens(data.access, data.refresh);
      setUser(data.user);
    },
    []
  );

  const register = useCallback(
    async (phone: string, password: string, fullName: string) => {
      // 1-bosqich: telefon → OTP yuboriladi, token berilmaydi
      // password optional - 3-bosqichda ham o'rnatilishi mumkin (spec)
      await api.post<{ phone: string; message: string }>("/auth/register/", {
        phone,
        password: password || undefined,
        full_name: fullName,
      });
    },
    []
  );

  const registerComplete = useCallback(
    async (phone: string, password: string) => {
      // 3-4 bosqich: OTP tasdiqlangandan keyin parol o'rnatiladi va token beriladi
      const data = await api.post<{ access: string; refresh: string; user: UserProfile }>(
        "/auth/register/complete/",
        { phone, password }
      );
      setTokens(data.access, data.refresh);
      setUser(data.user);
    },
    []
  );

  const telegramLogin = useCallback(
    async (data: Record<string, unknown>) => {
      const payload = await api.post<{ access: string; refresh: string; user: UserProfile }>(
        "/auth/telegram/",
        data
      );
      setTokens(payload.access, payload.refresh);
      setUser(payload.user);
      return payload.user;
    },
    []
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, registerComplete, telegramLogin, logout, refreshUser }),
    [user, loading, login, register, registerComplete, telegramLogin, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}