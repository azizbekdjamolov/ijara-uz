"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Menu, Plus } from "lucide-react";

import Sidebar from "./Sidebar";

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

          {/* Right: single CTA */}
          <Link
            href="/elon-joylash"
            className="flex items-center gap-1.5 btn btn-primary px-3.5 sm:px-4 py-2 text-sm shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden xs:inline sm:inline">{t("nav.postListing")}</span>
          </Link>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
