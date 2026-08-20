"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/elonlar?q=${encodeURIComponent(q)}` : "/elonlar");
  };

  return (
    <form onSubmit={submit} className="w-full max-w-2xl animate-fade-in-up">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-1.5 bg-[#0d1120]/80 backdrop-blur-xl border border-[rgba(212,175,55,0.25)] shadow-[0_16px_48px_rgba(0,0,0,0.45)] focus-within:border-[rgba(212,175,55,0.6)] focus-within:shadow-[0_0_0_4px_rgba(212,175,55,0.12)] transition-all">
        <Search size={20} className="text-gold shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Masalan: Chilonzorda 2 xonali, 5 milliongacha..."
          className="flex-1 py-2.5 text-[15px] outline-none placeholder:text-muted bg-transparent text-foreground"
          aria-label="E'lon qidirish"
        />
        <button
          type="submit"
          className="btn btn-primary text-sm px-6 py-2.5 shrink-0"
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}