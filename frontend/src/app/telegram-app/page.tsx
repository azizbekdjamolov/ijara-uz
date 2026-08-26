"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: Record<string, unknown>;
        ready: () => void;
        close: () => void;
      };
    };
  }
}

export default function TelegramAppPage() {
  const { telegramWebAppLogin, user, loading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace("/");
      return;
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setStatus("error");
      setErrorMsg("Bu sahifa faqat Telegram ichida ishlaydi.");
      return;
    }

    const initData = tg.initData;
    if (!initData) {
      setStatus("error");
      setErrorMsg("Telegram ma'lumotlari topilmadi.");
      return;
    }

    tg.ready();

    telegramWebAppLogin(initData)
      .then((loggedInUser) => {
        if (loggedInUser.has_password === false) {
          router.replace("/parol-ornatish");
        } else {
          router.replace("/");
        }
        router.refresh();
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Tizimga kirishda xatolik.");
      });
  }, [user, loading, telegramWebAppLogin, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm animate-fade-in-up">
          <div className="text-5xl mb-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto">
              <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="#2AABEE"/>
              <path d="M34.5 14.5l-3.2 15.2c-.2.9-.8 1.1-1.6.7l-4.5-3.3-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.5 8.1-7.3c.4-.3-.1-.5-.5-.2l-10 6.3-4.3-1.3c-.9-.3-.9-.9.2-1.3l16.8-6.5c.8-.3 1.5.2 1.2 1.4z" fill="#fff"/>
            </svg>
          </div>
          <h1 className="display text-xl font-bold text-foreground mb-2">
            Xatolik
          </h1>
          <p className="text-sm text-muted mb-6">{errorMsg}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#e8c869] to-[#d4af37] text-[#1a1405] text-sm font-semibold hover:brightness-110 transition-all"
          >
            Saytga o'tish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in-up">
        <div className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted">Kirilmoqda...</p>
      </div>
    </div>
  );
}
