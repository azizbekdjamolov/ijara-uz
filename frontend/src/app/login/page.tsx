"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Phone } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import TelegramLoginButton from "@/components/TelegramLoginButton";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-12 text-center text-muted">
          Yuklanmoqda...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier, password);
      router.push(searchParams.get("next") ?? "/profil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 md:py-16">
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white items-center justify-center text-2xl font-bold shadow-lg mb-4 animate-float">
            I
          </span>
          <h1 className="text-2xl font-bold text-foreground">Xush kelibsiz</h1>
          <p className="text-sm text-muted mt-1">
            Hisobingizga kiring yoki Telegram orqali davom eting
          </p>
        </div>

        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <TelegramLoginButton />

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-muted font-medium">yoki telefon bilan</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {error && (
            <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2.5 text-sm animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Telefon: +998901234567"
                required
                autoComplete="username"
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parol"
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
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Kirilmoqda...
                </span>
              ) : (
                "Kirish"
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted">
            Hisobingiz yo&apos;qmi?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Ro&apos;yxatdan o&apos;ting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}