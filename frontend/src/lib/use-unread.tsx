"use client";

import { useCallback, useEffect, useState, useRef } from "react";

import { api, getAccessToken } from "./api";

let sharedCount = 0;
let sharedTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function startPolling(pollMs: number) {
  if (sharedTimer) return;
  const tick = async () => {
    if (!getAccessToken()) {
      sharedCount = 0;
      notify();
      return;
    }
    try {
      const data = await api.get<{ count: number }>("/chat/unread-count/");
      sharedCount = data.count ?? 0;
      notify();
    } catch {
      /* silent */
    }
  };
  tick();
  sharedTimer = setInterval(tick, pollMs);
}

function stopPolling() {
  if (sharedTimer) {
    clearInterval(sharedTimer);
    sharedTimer = null;
  }
}

export function useUnreadCount(pollMs = 30000) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    startPolling(pollMs);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stopPolling();
    };
  }, [pollMs]);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      sharedCount = 0;
      notify();
      return;
    }
    try {
      const data = await api.get<{ count: number }>("/chat/unread-count/");
      sharedCount = data.count ?? 0;
      notify();
    } catch {
      /* silent */
    }
  }, []);

  return { count: sharedCount, refresh };
}

export function UnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_8px_rgba(255,107,94,0.5)] animate-scale-in">
      {count > 99 ? "99+" : count}
    </span>
  );
}
