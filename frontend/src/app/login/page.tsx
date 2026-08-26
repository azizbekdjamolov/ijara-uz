"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import TelegramLoginButton from "@/components/TelegramLoginButton";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-12 text-center text-muted">
          <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("+998");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cleanPhone = (raw: string) => {
    let v = raw.replace(/[^0-9+]/g, "");
    v = v.replace(/(?!^)\+/g, "");
    if (v.startsWith("+")) v = "+" + v.slice(1).replace(/\+/g, "");
    return v.slice(0, 13);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.push(searchParams.get("next") ?? "/");
    } catch {
      setError(t("login.invalidCredentials"));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] items-center justify-center display font-bold text-2xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] mb-5 animate-float">
            I
          </span>
          <h1 className="display text-3xl font-bold text-foreground">{t("login.title")}</h1>
          <p className="text-sm text-muted mt-2">{t("login.subtitle")}</p>
          <div className="gold-line w-24 mx-auto mt-5" />
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <TelegramLoginButton />

          {BOT_USERNAME ? (
            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-muted font-medium">{t("login.orPhone")}</span>
              <span className="flex-1 h-px bg-[var(--border)]" />
            </div>
          ) : null}

          {error && (
            <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.35)] text-danger rounded-xl px-4 py-2.5 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={identifier}
                onChange={(e) => setIdentifier(cleanPhone(e.target.value))}
                placeholder="+998901234567"
                required
                autoComplete="username"
                inputMode="tel"
                maxLength={13}
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                required
                autoComplete="current-password"
                className="input pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label="Parolni ko'rsatish"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
              {submitting ? (
                <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
              ) : (
                t("login.submit")
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted">
            {t("login.noAccount")}{" "}
            <Link href="/register" className="text-gold font-semibold hover:text-gold-light transition-colors">
              {t("login.registerLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
