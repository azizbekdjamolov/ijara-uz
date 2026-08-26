"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Menu, Plus } from "lucide-react";

import Sidebar from "./Sidebar";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export default function Header() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors"
        style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--header-border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Left: burger + logo */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors shrink-0"
              aria-label="Menyu"
            >
              <Menu size={22} />
            </button>
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-serif font-bold text-lg shadow-[0_4px_16px_rgba(212,175,55,0.4)] group-hover:shadow-[0_6px_24px_rgba(212,175,55,0.55)] transition-shadow shrink-0">
                I
              </span>
              <span className="font-serif font-bold text-xl tracking-tight text-foreground truncate">
                Ijara<span className="text-gold">.uz</span>
              </span>
            </Link>
          </div>

          {/* Right: Telegram + CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {BOT_USERNAME && (
              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-[rgba(34,158,217,0.1)] text-muted hover:text-[#229ed9] transition-colors"
                aria-label="Telegram bot"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            )}
            <Link
              href="/elon-joylash"
              className="flex items-center gap-1.5 btn btn-primary px-3.5 sm:px-4 py-2 text-sm shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden xs:inline sm:inline">{t("nav.postListing")}</span>
            </Link>
          </div>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
