"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Home, Heart, MapPin, Plus, Search, UserPlus } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/lib/use-unread";

export default function BottomBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount(30000);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const items = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/elonlar", label: t("nav.listings"), icon: Search },
    { href: "/xarita", label: t("nav.map"), icon: MapPin },
    { href: "/saqlanganlar", label: t("nav.favorites"), icon: Heart },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t backdrop-blur-xl transition-colors"
      style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--header-border)" }}>
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = active(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 w-16 py-1 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-gold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href={user ? "/profil" : "/register"}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-0 w-16 py-1 rounded-xl text-[10px] font-medium transition-colors ${
            active(user ? "/profil" : "/register")
              ? "text-gold"
              : "text-muted hover:text-foreground"
          }`}
        >
          {user ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold text-[11px] shadow-sm">
                {(user.full_name || "U").charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{t("nav.profile")}</span>
            </>
          ) : (
            <>
              <UserPlus size={20} strokeWidth={1.8} />
              <span className="truncate">{t("nav.register")}</span>
            </>
          )}
        </Link>
      </div>
    </nav>
  );
}
