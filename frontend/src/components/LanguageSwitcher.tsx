"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { SUPPORTED_LANGS } from "@/i18n";

const LANG_META: Record<string, { label: string; flag: string }> = {
  uz: { label: "O'zbekcha", flag: "🇺🇿" },
  ru: { label: "Русский", flag: "🇷🇺" },
  en: { label: "English", flag: "🇬🇧" },
};

const STORAGE_KEY = "ijara_lang";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("uz");

  useEffect(() => {
    const lng = i18n.language?.slice(0, 2) || "uz";
    setCurrent(lng);
  }, [i18n.language]);

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    setCurrent(code);
    setOpen(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2">
        {SUPPORTED_LANGS.map((code) => (
          <button
            key={code}
            onClick={() => switchLang(code)}
            className={`px-2 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
              current === code
                ? "bg-[rgba(212,175,55,0.15)] text-gold"
                : "text-muted hover:text-foreground"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-white/5 hover:text-foreground transition-all"
      >
        <Globe size={18} />
        <span className="flex-1 text-left">{t("language.title", "Til")}</span>
        <span className="text-muted text-xs">{LANG_META[current]?.flag} {current.toUpperCase()}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-3 right-3 bottom-full mb-1 z-50 rounded-xl overflow-hidden animate-scale-in"
            style={{ backgroundColor: "var(--bg-2)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
          >
            {SUPPORTED_LANGS.map((code) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  current === code ? "text-gold font-semibold" : "text-foreground/70 hover:bg-white/5"
                }`}
              >
                <span>{LANG_META[code]?.flag}</span>
                <span className="flex-1 text-left">{LANG_META[code]?.label}</span>
                {current === code && <Check size={15} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
