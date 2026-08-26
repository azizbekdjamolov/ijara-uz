"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const { telegramLogin, telegramCodeLogin, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const startTimeRef = useRef(0);

  // Code login state
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // Auto-fill code from URL params (?tg_code=XXXXXX)
  useEffect(() => {
    const tgCode = searchParams.get("tg_code");
    if (tgCode && /^\d{6}$/.test(tgCode)) {
      setCodeValue(tgCode);
      setShowCodeInput(true);
      // Auto-submit
      handleCodeLogin(tgCode);
    }
  }, [searchParams]);

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

  const handleCodeLogin = useCallback(async (codeOverride?: string) => {
    const code = (codeOverride || codeValue).trim();
    if (!code || code.length !== 6) return;

    setCodeLoading(true);
    setError(null);
    try {
      const loggedInUser = await telegramCodeLogin(code);
      if (loggedInUser.has_password === false) {
        router.push("/parol-ornatish");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Noto'g'ri") || msg.includes("muddati")) {
        setError(t("login.codeInvalid"));
      } else {
        setError(t("login.telegramError"));
      }
    } finally {
      setCodeLoading(false);
    }
  }, [codeValue, telegramCodeLogin, router, t]);

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
      {error && !loading && !codeLoading && (
        <div className="text-xs text-danger text-center">{error}</div>
      )}

      {/* Code input UI */}
      {showCodeInput && (
        <div className="w-full space-y-2">
          <p className="text-xs text-muted text-center">
            {t("login.codeInstructions")}{" "}
            <Link
              href={`https://t.me/${BOT_USERNAME}?start=login`}
              className="text-gold hover:text-gold-light"
              target="_blank"
          rel="noopener noreferrer"
        >
            @{BOT_USERNAME}
          </Link>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="input flex-1 text-center tracking-[0.3em] font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && codeValue.length === 6) {
                handleCodeLogin();
              }
            }}
          />
          <button
            onClick={() => handleCodeLogin()}
            disabled={codeLoading || codeValue.length !== 6}
            className="btn btn-primary px-4 py-2 text-sm shrink-0"
          >
            {codeLoading ? (
              <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
            ) : (
              t("login.verifyCode")
            )}
          </button>
        </div>
        <button
          onClick={() => { setShowCodeInput(false); setCodeValue(""); setError(null); }}
          className="text-xs text-muted hover:text-foreground w-full text-center"
        >
          {t("login.backToWidget")}
        </button>
      </div>
    )}

      {/* Telegram widget */}
      {!showCodeInput && (
        <>
          <div
            ref={containerRef}
            className="w-full [&_iframe]:!w-full [&_iframe]:!max-w-full [&_.telegram-login-widget]:!w-full [&_.telegram-login-widget]:!max-w-full [&_.telegram-login-widget]:!overflow-visible"
          />
          {widgetFailed && !loading && !error && (
            <div className="w-full space-y-2">
              <Link
                href={`https://t.me/${BOT_USERNAME}?start=login`}
                className="btn btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("login.telegramBtn")}
              </Link>
              <button
                onClick={() => setShowCodeInput(true)}
                className="text-xs text-muted hover:text-foreground w-full text-center"
              >
                {t("login.useCode")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
