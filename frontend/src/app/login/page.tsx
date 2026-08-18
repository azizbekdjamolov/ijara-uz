"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-12 text-center text-[#9CA3AF]">
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <h1 className="text-xl font-bold text-center mb-1">Tizimga kirish</h1>
        <p className="text-sm text-[#6B7280] text-center mb-6">
          Telefon raqamingiz va parolingizni kiriting
        </p>
        {error && (
          <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Telefon: +998901234567"
            required
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
            required
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#16A34A] text-white font-semibold py-2.5 rounded-lg hover:bg-[#15803D] disabled:opacity-60"
          >
            {submitting ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-[#6B7280]">
          Hisobingiz yo'qmi?{" "}
          <Link href="/register" className="text-[#16A34A] font-medium hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </div>
      </div>
    </div>
  );
}