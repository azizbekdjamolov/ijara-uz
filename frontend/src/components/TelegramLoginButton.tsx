"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

const TOTAL_TIMEOUT_MS = 60_000;

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
  const startTimeRef = useRef(0);

  const handleAuth = useCallback(async (tgUser: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    startTimeRef.current = Date.now();

    try {
      const loggedInUser = await telegramLogin(tgUser);
      if (loggedInUser.has_password === false) {
        router.push("/parol-ornatish");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const isNetwork =
        e instanceof ApiRequestError && e.status === 0;
      const isServerWaking = msg.includes("uyg'onmoqda") || msg.includes("waking") || msg.includes("kuting") || msg.includes("wait");

      if (isNetwork && isServerWaking && Date.now() - startTimeRef.current < TOTAL_TIMEOUT_MS) {
        setLoading(true);
        setError(t("login.serverWaking"));
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const loggedInUser = await telegramLogin(tgUser);
          if (loggedInUser.has_password === false) {
            router.push("/parol-ornatish");
          } else {
            router.push("/");
          }
          router.refresh();
          return;
        } catch {
          // final failure, fall through to error display
        }
      }

      if (
        e instanceof ApiRequestError &&
        (e.status === 400 || e.status === 409) &&
        (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("allaqachon") || msg.toLowerCase().includes("mavjud"))
      ) {
        setError(t("login.accountExists"));
      } else if (isNetwork) {
        setError(t("login.telegramError"));
      } else {
        setError(msg || t("login.telegramError"));
      }
    } finally {
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

    let observer: MutationObserver | null = null;

    const forceIframeWidth = () => {
      const iframes = container.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        iframe.style.width = "100%";
        iframe.style.maxWidth = "100%";
        if (iframe.parentElement) {
          iframe.parentElement.style.width = "100%";
          iframe.parentElement.style.maxWidth = "100%";
        }
      });
    };

    observer = new MutationObserver(() => {
      forceIframeWidth();
    });
    observer.observe(container, { childList: true, subtree: true });

    const failTimer = window.setTimeout(() => setWidgetFailed(true), 8000);

    return () => {
      window.clearTimeout(failTimer);
      window.onTelegramAuth = undefined;
      observer?.disconnect();
    };
  }, [handleAuth, i18n.language]);

  if (!BOT_USERNAME) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 min-h-[52px] justify-center w-full">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted animate-pulse-soft">
          <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          {error && error.includes("uyg'onmoqda") ? t("login.serverWaking") : t("login.telegramLoading")}
        </div>
      )}
      {error && !loading && (
        <div className="text-xs text-danger text-center">{error}</div>
      )}
      <div
        ref={containerRef}
        className="w-full [&_iframe]:!w-full [&_iframe]:!max-w-full [&_.telegram-login-widget]:!w-full [&_.telegram-login-widget]:!max-w-full [&_.telegram-login-widget]:!overflow-visible"
      />
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
