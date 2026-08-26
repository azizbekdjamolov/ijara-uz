"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SetPasswordPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/parol-ornatish");
    }
  }, [user, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("register.passwordHint"));
      return;
    }
    if (password !== confirm) {
      setError(t("setPassword.mismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/set-password/", { password });
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t("common.error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) return null;

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 md:py-16 text-center animate-fade-in-up">
        <div className="card p-8">
          <ShieldCheck size={48} className="mx-auto text-gold mb-4" />
          <h2 className="display text-xl font-bold mb-2">{t("setPassword.done")}</h2>
          <p className="text-sm text-muted">{t("setPassword.redirecting")}</p>
        </div>
      </div>
    );
  }

  const inputWrap = "relative";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-muted";

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] items-center justify-center display font-bold text-2xl shadow-[0_10px_30px_rgba(212,175,55,0.4)] mb-5 animate-float">
            I
          </span>
          <h1 className="display text-3xl font-bold text-foreground">{t("setPassword.title")}</h1>
          <p className="text-sm text-muted mt-2">{t("setPassword.subtitle")}</p>
          <div className="gold-line w-24 mx-auto mt-5" />
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {error && (
            <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.35)] text-danger rounded-xl px-4 py-2.5 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className={inputWrap}>
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
                aria-label={t("setPassword.toggle")}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className={inputWrap}>
              <Lock size={16} className={iconClass} />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("setPassword.confirmPlaceholder")}
                required
                minLength={8}
                autoComplete="new-password"
                className="input pl-10"
              />
            </div>

            <p className="text-xs text-muted">{t("register.passwordHint")}</p>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-sm">
              {submitting ? (
                <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
              ) : (
                t("setPassword.submit")
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted">
            <Link href="/" className="text-gold font-semibold hover:text-gold-light transition-colors">
              {t("setPassword.skip")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
