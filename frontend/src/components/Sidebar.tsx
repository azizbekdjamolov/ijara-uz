"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Heart,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  User,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { UnreadBadge, useUnreadCount } from "@/lib/use-unread";
import LanguageSwitcher from "./LanguageSwitcher";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { count: unreadCount } = useUnreadCount(30000);
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleLogout = () => {
    setLoggingOut(true);
    logout();
    onClose();
    router.push("/login");
    setTimeout(() => setLoggingOut(false), 300);
  };

  const navItems = [
    { href: "/", label: t("nav.home"), icon: Home, badge: 0 },
    { href: "/elonlar", label: t("nav.listings"), icon: Search, badge: 0 },
    { href: "/xarita", label: t("nav.map"), icon: MapPin, badge: 0 },
    ...(user
      ? [
          { href: "/profil", label: t("nav.profile"), icon: User, badge: 0 },
          { href: "/xabarlar", label: t("nav.messages"), icon: MessageCircle, badge: unreadCount },
          { href: "/saqlanganlar", label: t("nav.favorites"), icon: Heart, badge: 0 },
        ]
      : []),
    ...(user?.role === "moderator" || user?.role === "admin"
      ? [{ href: "/moderatsiya", label: t("nav.moderation"), icon: ShieldCheck, badge: 0 }]
      : []),
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[320px] max-w-[88vw] flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)",
          borderRight: "1px solid var(--border)",
          boxShadow: open ? "var(--shadow-lg)" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-serif font-bold text-lg shadow-[0_4px_16px_rgba(212,175,55,0.4)]">
              I
            </span>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">
              Ijara<span className="text-gold">.uz</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* User card / login CTA */}
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          {user ? (
            <button onClick={() => navigate("/profil")} className="w-full flex items-center gap-3 text-left group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                {(user.full_name || "F").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{user.full_name || t("nav.profile")}</div>
                <div className="text-xs text-muted truncate">
                  {user.telegram_username ? `@${user.telegram_username}` : user.phone ?? ""}
                </div>
                {user.city && <div className="text-[11px] text-muted truncate">{user.city}</div>}
              </div>
            </button>
          ) : (
            <button onClick={() => navigate("/login")} className="btn btn-primary w-full py-3 text-sm">
              <User size={16} />
              {t("nav.login")}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 min-h-0">
          {navItems.map((item) => {
            const isActive = active(item.href);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                  isActive
                    ? "bg-[rgba(212,175,55,0.12)] text-gold"
                    : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className="relative shrink-0">
                  <item.icon size={18} />
                  <UnreadBadge count={item.badge} />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Post listing CTA */}
        <div className="px-4 pb-3 shrink-0">
          <button onClick={() => navigate("/elon-joylash")} className="btn btn-primary w-full py-3 text-sm">
            <Plus size={16} strokeWidth={2.5} />
            {t("nav.postListing")}
          </button>
        </div>

        {/* Settings */}
        <div className="px-3 pb-2 pt-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
          <LanguageSwitcher />

          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-white/5 hover:text-foreground transition-all"
          >
            <span className="shrink-0">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="flex-1 text-left">
              {theme === "dark" ? t("theme.light", "Yorug' mavzu") : t("theme.dark", "Qorong'i mavzu")}
            </span>
            <span
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                theme === "light" ? "bg-[rgba(212,175,55,0.5)]" : "bg-white/15"
              }`}
              style={{ width: 40, height: 22 }}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  theme === "light" ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>

        {/* Logout */}
        {user && (
          <div className="px-3 pb-5 shrink-0">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-danger hover:bg-white/5 transition-all"
            >
              <LogOut size={18} />
              {t("nav.logout")}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
