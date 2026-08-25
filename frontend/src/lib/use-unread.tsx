"use client";

import { useCallback, useEffect, useState } from "react";

import { api, getAccessToken } from "./api";

export function useUnreadCount(pollMs = 30000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setCount(0);
      return;
    }
    try {
      const data = await api.get<{ count: number }>("/chat/unread-count/");
      setCount(data.count ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  return { count, refresh };
}

export function UnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_8px_rgba(255,107,94,0.5)] animate-scale-in">
      {count > 99 ? "99+" : count}
    </span>
  );
}
