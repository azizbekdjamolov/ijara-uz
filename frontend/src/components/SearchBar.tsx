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
      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-4 py-1.5 border border-[var(--border)] focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(0,122,255,0.15)] transition-all">
        <Search size={20} className="text-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Masalan: Chilonzorda 2 xonali, 5 milliongacha..."
          className="flex-1 py-2.5 text-[15px] outline-none placeholder:text-muted bg-transparent"
          aria-label="E'lon qidirish"
        />
        <button
          type="submit"
          className="btn btn-primary text-sm px-5 py-2.5 shrink-0"
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}