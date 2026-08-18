"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(phone, password, fullName);
      router.push("/profil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <h1 className="text-xl font-bold text-center mb-1">Ro'yxatdan o'tish</h1>
        <p className="text-sm text-[#6B7280] text-center mb-6">
          Ijaraga olish yoki ijaraga berishni boshlang
        </p>
        {error && (
          <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ism familiya"
            required
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon: +998901234567"
            required
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol (kamida 8 belgi)"
            required
            minLength={8}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#16A34A] text-white font-semibold py-2.5 rounded-lg hover:bg-[#15803D] disabled:opacity-60"
          >
            {submitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-[#6B7280]">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-[#16A34A] font-medium hover:underline">
            Kiring
          </Link>
        </div>
      </div>
    </div>
  );
}