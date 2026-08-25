"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/elonlar?q=${encodeURIComponent(q)}` : "/elonlar");
  };

  return (
    <form onSubmit={submit} className="w-full max-w-2xl animate-fade-in-up">
      <div className="flex items-center gap-2 rounded-2xl px-4 py-1.5 backdrop-blur-xl border shadow-[0_16px_48px_rgba(0,0,0,0.45)] focus-within:shadow-[0_0_0_4px_rgba(212,175,55,0.12)] transition-all"
        style={{ backgroundColor: "var(--surface-strong)", borderColor: "var(--border)" }}>
        <Search size={20} className="text-gold shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("hero.searchPlaceholder")}
          className="flex-1 py-2.5 text-[15px] outline-none placeholder:text-muted bg-transparent text-foreground"
          aria-label={t("common.search")}
        />
        <button
          type="submit"
          className="btn btn-primary text-sm px-6 py-2.5 shrink-0"
        >
          {t("common.search")}
        </button>
      </div>
    </form>
  );
}
