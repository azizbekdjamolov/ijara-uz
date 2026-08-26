"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, User } from "lucide-react";

import { useAuth } from "@/lib/auth-context";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export default function Footer() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <footer className="mt-12 safe-bottom pb-20 md:pb-8 border-t backdrop-blur-xl transition-colors"
      style={{ borderColor: "var(--header-border)", backgroundColor: "var(--footer-bg)" }}>
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-serif font-bold shadow-md">
              I
            </span>
            <span className="font-serif font-bold text-lg">
              Ijara<span className="text-gold">.uz</span>
            </span>
          </div>
          <p className="text-muted">
            {t("footer.about")}
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-foreground">{t("nav.listings")}</h3>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/elonlar" className="hover:text-gold transition-colors">
                {t("footer.listings")}
              </Link>
            </li>
            <li>
              <Link href="/xarita" className="hover:text-gold transition-colors">
                {t("footer.map")}
              </Link>
            </li>
            <li>
              <Link href="/elon-joylash" className="hover:text-gold transition-colors">
                {t("footer.postListing")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-foreground">{t("footer.userSection")}</h3>
          <ul className="space-y-2 text-muted">
            {user ? (
              <>
                <li>
                  <Link href="/profil" className="hover:text-gold transition-colors flex items-center gap-1.5">
                    <User size={14} />
                    {t("nav.profile")}
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="hover:text-gold transition-colors flex items-center gap-1.5">
                    <LogOut size={14} />
                    {t("nav.logout")}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className="hover:text-gold transition-colors">
                    {t("nav.login")}
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-gold transition-colors">
                    {t("nav.register")}
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link href="/saqlanganlar" className="hover:text-gold transition-colors">
                {t("nav.favorites")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-foreground">{t("footer.helpSection")}</h3>
          <ul className="space-y-2 text-muted">
            <li>{t("footer.safetyRules")}</li>
            <li>{t("footer.phone")}</li>
            <li>{t("footer.email")}</li>
            {BOT_USERNAME && (
              <li>
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#229ed9] transition-colors flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  {t("footer.telegramBot")}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="gold-line mx-auto max-w-3xl" />
      <div className="py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Ijara.uz — {t("footer.copyright")}
      </div>
    </footer>
  );
}
