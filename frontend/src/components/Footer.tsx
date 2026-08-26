"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, User } from "lucide-react";

import { useAuth } from "@/lib/auth-context";

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
