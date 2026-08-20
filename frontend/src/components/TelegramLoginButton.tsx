"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

let widgetInstalled = false;

export default function TelegramLoginButton() {
  const { telegramLogin } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (user: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      await telegramLogin(user);
      router.push("/profil");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : "Telegram orqali kirishda xatolik"
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!BOT_USERNAME) return;
    const container = containerRef.current;
    if (!container) return;

    window.onTelegramAuth = handleAuth;

    if (widgetInstalled) return;
    widgetInstalled = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-onauth", "window.onTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!BOT_USERNAME) {
    return (
      <div className="text-xs text-muted text-center py-3">
        Telegram orqali kirish mavjud emas
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 min-h-[52px] justify-center">
      {loading && (
        <div className="text-xs text-muted animate-pulse-soft">
          Telegram orqali kiritilmoqda...
        </div>
      )}
      {error && (
        <div className="text-xs text-danger text-center">{error}</div>
      )}
      <div ref={containerRef} />
    </div>
  );
}