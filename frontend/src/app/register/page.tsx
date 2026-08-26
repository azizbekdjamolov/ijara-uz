"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Lock, Phone, ShieldCheck, User } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

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
      router.push("/profil");
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
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] items-center justify-center display font-bold text-2xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] mb-5 animate-float">
            I
          </span>
          <h1 className="display text-3xl font-bold text-foreground">{stepTitle}</h1>
          <p className="text-sm text-muted mt-2">
            {step === "verify"
              ? t("register.step2Desc", { phone })
              : step === "password"
                ? t("register.step3Desc")
                : t("register.step1Desc")}
          </p>
          <div className="gold-line w-24 mx-auto mt-5" />
          <div className="mt-4 flex justify-center">
            <LanguageSwitcher compact />
          </div>
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {step === "form" && BOT_USERNAME && (
            <>
              <TelegramLoginButton />
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
              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
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
              <button type="submit" disabled={submitting || code.length !== 6} className="btn btn-primary w-full py-3 text-sm">
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
              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
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
