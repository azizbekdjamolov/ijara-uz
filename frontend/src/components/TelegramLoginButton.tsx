"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export default function TelegramLoginButton() {
  const { t, i18n } = useTranslation();
  const { telegramLogin, user } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);

  const MAX_RETRIES = 2;

  const handleAuth = useCallback(async (tgUser: Record<string, unknown>, attempt = 0) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await telegramLogin(tgUser);
      if (loggedInUser.has_password === false) {
        router.push("/parol-ornatish");
      } else {
        router.push("/profil");
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const isTimeout = e instanceof ApiRequestError && e.status === 0 && msg.includes("tugadi");

      if (isTimeout && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000));
        return handleAuth(tgUser, attempt + 1);
      }

      if (
        e instanceof ApiRequestError &&
        (e.status === 400 || e.status === 409) &&
        (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("allaqachon") || msg.toLowerCase().includes("mavjud"))
      ) {
        setError(t("login.accountExists"));
      } else {
        setError(
          e instanceof ApiRequestError ? e.message : t("login.telegramError")
        );
      }
      setLoading(false);
    }
  }, [telegramLogin, router, t]);

  useEffect(() => {
    if (!BOT_USERNAME) return;
    const container = containerRef.current;
    if (!container) return;

    window.onTelegramAuth = handleAuth;

    container.innerHTML = "";
    setWidgetFailed(false);

    const lang = i18n.language || "en";

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-lang", lang);
    script.setAttribute("data-onauth", "window.onTelegramAuth(user)");
    script.setAttribute("data-origin", window.location.origin);
    container.appendChild(script);

    const failTimer = window.setTimeout(() => setWidgetFailed(true), 8000);

    return () => {
      window.clearTimeout(failTimer);
      window.onTelegramAuth = undefined;
    };
  }, [handleAuth, i18n.language]);

  if (!BOT_USERNAME) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 min-h-[52px] justify-center">
      {loading && (
        <div className="text-xs text-muted animate-pulse-soft">
          {t("login.telegramLoading")}
        </div>
      )}
      {error && (
        <div className="text-xs text-danger text-center">{error}</div>
      )}
      <div ref={containerRef} />
      {widgetFailed && !loading && !error && (
        <Link
          href={`https://t.me/${BOT_USERNAME}?start=auth`}
          className="btn btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("login.telegramBtn")}
        </Link>
      )}
    </div>
  );
}
