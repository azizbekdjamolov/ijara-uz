"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Lock, Phone, ShieldCheck, User } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

function LogoSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" rx="12" fill="url(#logo-grad)" />
      <path
        d="M12 28V12h3.2c1.8 0 3.2.6 4.1 1.6.8.9 1.3 2.2 1.3 3.7 0 1.5-.5 2.7-1.3 3.6-.9 1-2.3 1.5-4.1 1.5H15v5.6H12zm3-7.8h.3c1.1 0 1.9-.3 2.4-.9.5-.6.8-1.3.8-2.2s-.3-1.6-.8-2.2c-.5-.6-1.3-.9-2.4-.9H15v6.2z"
        fill="#1a1405"
      />
      <path
        d="M23 28V12h3.2l4.8 10.8V12H34v16h-3.2L26 17.2V28H23z"
        fill="#1a1405"
      />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8c869" />
          <stop offset="1" stopColor="#b3902a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, registerComplete } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify" | "password">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cleanPhone = (raw: string) => {
    let v = raw.replace(/[^0-9+]/g, "");
    v = v.replace(/(?!^)\+/g, "");
    if (v.startsWith("+")) v = "+" + v.slice(1).replace(/\+/g, "");
    return v.slice(0, 13);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\+998\d{9}$/.test(phone)) {
      setError(t("register.phoneError"));
      return;
    }
    if (!fullName.trim()) {
      setError(t("register.nameError"));
      return;
    }
    setSubmitting(true);
    try {
      await register(phone, "", fullName.trim());
      setStep("verify");
      setNotice(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("allaqachon") || msg.toLowerCase().includes("mavjud")) {
        setError(t("register.accountAlreadyExists"));
      } else if (msg.includes("uyg'onmoqda") || msg.includes("kuting")) {
        setError(t("register.serverWaking"));
      } else {
        setError(msg || t("common.error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/verify/phone/", { phone, code });
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("register.passwordHint"));
      return;
    }
    setSubmitting(true);
    try {
      await registerComplete(phone, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("common.error"));
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    try {
      await api.post("/auth/resend-verification/", { channel: "phone", phone });
      setNotice(t("register.resendSuccess"));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("common.error"));
    }
  };

  const stepTitle =
    step === "form" ? t("register.title") :
    step === "verify" ? t("register.step2Title") : t("register.step3Title");

  const inputWrap = "relative";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-muted";

  return (
    <div className="register-page min-h-screen flex items-center justify-center px-4 py-12 md:py-16">
      <div className="w-full max-w-[420px] animate-fade-in-up">
        <div className="text-center mb-6">
          <LogoSvg className="w-14 h-14 mx-auto mb-4" />
          <h1 className="display text-2xl md:text-3xl font-bold text-foreground">{stepTitle}</h1>
          <p className="text-sm text-muted mt-1.5">
            {step === "verify"
              ? t("register.step2Desc", { phone })
              : step === "password"
                ? t("register.step3Desc")
                : t("register.step1Desc")}
          </p>
          <div className="mt-4 flex justify-center">
            <LanguageSwitcher compact />
          </div>
        </div>

        <div className="register-card p-6 md:p-7 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {step === "form" && BOT_USERNAME && (
            <>
              <Suspense fallback={null}>
                <TelegramLoginButton />
              </Suspense>
              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-muted font-medium">{t("login.orPhone")}</span>
                <span className="flex-1 h-px bg-[var(--border)]" />
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.35)] text-danger rounded-xl px-4 py-2.5 text-sm animate-scale-in">
              {error}
            </div>
          )}
          {notice && !error && (
            <div className="mb-4 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.35)] text-gold rounded-xl px-4 py-2.5 text-sm animate-scale-in">
              {notice}
            </div>
          )}

          {step === "form" && (
            <form onSubmit={submitForm} className="space-y-4">
              <div className={inputWrap}>
                <User size={16} className={iconClass} />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("register.fullNamePlaceholder")}
                  required
                  className="input pl-10"
                />
              </div>
              <div className={inputWrap}>
                <Phone size={16} className={iconClass} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(cleanPhone(e.target.value))}
                  placeholder="+998901234567"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={13}
                  className="input pl-10"
                />
              </div>
              <button type="submit" disabled={submitting} className="register-cta w-full py-3 text-sm font-semibold">
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
                ) : (
                  t("register.submitPhone")
                )}
              </button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="text-center text-sm text-muted mb-1">
                <ShieldCheck size={30} className="mx-auto text-gold mb-2" />
                {t("register.codeDesc")}
              </div>
              <div className={inputWrap}>
                <KeyRound size={16} className={iconClass} />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("register.codePlaceholder")}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  className="input pl-10 text-center text-lg tracking-[0.4em]"
                />
              </div>
              <button type="submit" disabled={submitting || code.length !== 6} className="register-cta w-full py-3 text-sm font-semibold">
                {submitting ? t("register.submitCodeLoading") : t("register.submitCode")}
              </button>
              <button type="button" onClick={resendCode} className="w-full text-center text-sm text-gold font-medium hover:text-gold-light transition-colors">
                {t("register.resend")}
              </button>
              <button type="button" onClick={() => setStep("form")} className="w-full text-center text-sm text-muted hover:text-foreground transition-colors">
                {t("register.changePhone")}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="relative">
                <Lock size={16} className={iconClass} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("register.passwordPlaceholder")}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <p className="text-xs text-muted">{t("register.passwordHint")}</p>
              <button type="submit" disabled={submitting} className="register-cta w-full py-3 text-sm font-semibold">
                {submitting ? t("register.submitPasswordLoading") : t("register.submitPassword")}
              </button>
            </form>
          )}

          {step === "form" && (
            <div className="mt-5 text-center text-sm text-muted">
              {t("register.hasAccount")}{" "}
              <Link href="/login" className="text-gold font-semibold hover:text-gold-light transition-colors">
                {t("register.loginLink")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
