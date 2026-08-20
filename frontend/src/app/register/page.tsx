"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Phone, ShieldCheck, User } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import TelegramLoginButton from "@/components/TelegramLoginButton";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(phone, password, fullName);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/auth/verify/phone/", { code });
      router.push("/profil");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Xatolik yuz berdi");
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await api.post("/auth/resend-verification/", { channel: "phone" });
      setError("Yangi kod yuborildi.");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Xatolik");
    }
  };

  const inputWrap = "relative";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-muted";

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] items-center justify-center display font-bold text-2xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] mb-5 animate-float">
            I
          </span>
          <h1 className="display text-3xl font-bold text-foreground">
            {step === "form" ? "Ro'yxatdan o'tish" : "Telefonni tasdiqlash"}
          </h1>
          <p className="text-sm text-muted mt-2">
            {step === "form"
              ? "Ijaraga olish yoki ijaraga berishni boshlang"
              : `${phone} raqamiga kod yuborildi`}
          </p>
          <div className="gold-line w-24 mx-auto mt-5" />
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {step === "form" ? (
            <>
              <TelegramLoginButton />

              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
                <span className="text-xs text-muted font-medium">yoki telefon bilan</span>
                <span className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
              </div>
            </>
          ) : null}

          {error && (
            <div
              className={`mb-4 rounded-xl px-4 py-2.5 text-sm animate-scale-in ${
                error.startsWith("Yangi kod")
                  ? "bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.35)] text-gold"
                  : "bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.35)] text-danger"
              }`}
            >
              {error}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={submit} className="space-y-4">
              <div className={inputWrap}>
                <User size={16} className={iconClass} />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ism familiya"
                  required
                  className="input pl-10"
                />
              </div>
              <div className={inputWrap}>
                <Phone size={16} className={iconClass} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefon: +998901234567"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  className="input pl-10"
                />
              </div>
              <div className={inputWrap}>
                <Lock size={16} className={iconClass} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parol (kamida 8 belgi)"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input pl-10"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
                    Yuborilmoqda...
                  </span>
                ) : (
                  "Ro'yxatdan o'tish"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="text-center text-sm text-muted mb-2">
                <ShieldCheck size={32} className="mx-auto text-gold mb-2" />
                SMS orqali kelgan 6 xonali kodni kiriting
              </div>
              <div className={inputWrap}>
                <KeyRound size={16} className={iconClass} />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  className="input pl-10 text-center text-lg tracking-[0.4em]"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
                    Tasdiqlanmoqda...
                  </span>
                ) : (
                  "Tasdiqlash"
                )}
              </button>
              <button
                type="button"
                onClick={resend}
                className="w-full text-center text-sm text-gold font-medium hover:text-gold-light transition-colors"
              >
                Kod kelmadimi? Qayta yuborish
              </button>
            </form>
          )}

          {step === "form" && (
            <div className="mt-5 text-center text-sm text-muted">
              Hisobingiz bormi?{" "}
              <Link href="/login" className="text-gold font-semibold hover:text-gold-light transition-colors">
                Kiring
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}