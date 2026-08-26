"use client";

import { API_URL } from "./types";

const ACCESS_KEY = "ijara_access";
const REFRESH_KEY = "ijara_refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccess(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      clearTokens();
      return null;
    }
    let data: { access?: string } = {};
    try {
      data = await response.json();
    } catch {
      clearTokens();
      return null;
    }
    if (!data.access) {
      clearTokens();
      return null;
    }
    setTokens(data.access, refresh);
    return data.access;
  } catch {
    // Tarmoq uzildi yoki timeout - qulash emas
    return null;
  }
}

export interface ApiError {
  message?: string;
  [key: string]: unknown;
}

export class ApiRequestError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function flattenDrfErrors(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") return {};
  const result: Record<string, string> = {};
  const obj = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key === "message" || key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(value) && value.length > 0) {
      result[key] = String(value[0]);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = flattenDrfErrors(value);
      for (const [nk, nv] of Object.entries(nested)) {
        result[nk] = nv;
      }
    }
  }
  return result;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  timeoutMs = 15000
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
  } catch (err) {
    // Tarmoq xatosi - sayt qulamaydi, chiroyli xabar
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    throw new ApiRequestError(0, isAbort ? "So'rov vaqti tugadi, internetni tekshiring" : "Tarmoq xatosi, serverga ulanib bo'lmadi");
  }

  if (response.status === 401 && token && retry) {
    const fresh = await refreshAccess();
    if (fresh) return request<T>(path, options, false);
  }

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    // Ba'zan backend HTML qaytaradi (500) - uni JSON deb o'qishga urinmaymiz
    try {
      const text = await response.text();
      if (text) data = { message: text.slice(0, 300) } as unknown;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const fieldErrors = flattenDrfErrors(data);
    const message =
      (data as ApiError)?.message ??
      (data as { detail?: string })?.detail ??
      (Object.keys(fieldErrors).length > 0
        ? Object.values(fieldErrors)[0]
        : `Xatolik yuz berdi (${response.status})`);
    throw new ApiRequestError(response.status || 500, message, fieldErrors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit, timeoutMs?: number) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }, true, timeoutMs),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, options?: RequestInit) =>
    request<T>(path, { ...options, method: "POST", body: formData }),
};