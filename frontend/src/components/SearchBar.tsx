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
    <form onSubmit={submit} className="w-full max-w-2xl">
      <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-[#E5E7EB] px-4 py-2">
        <Search size={20} className="text-[#9CA3AF] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Masalan: Chilonzorda 2 xonali, 5 milliongacha..."
          className="flex-1 py-2.5 text-[15px] outline-none placeholder:text-[#9CA3AF] bg-transparent"
          aria-label="E'lon qidirish"
        />
        <button
          type="submit"
          className="bg-[#16A34A] text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#15803D]"
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}