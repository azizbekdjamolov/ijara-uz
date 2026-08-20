"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  User,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const bottomItem = (href: string, label: string, icon: React.ReactNode) => {
    const isActive = active(href);
    return (
      <Link
        href={href}
        className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
          isActive ? "text-primary" : "text-muted hover:text-foreground"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-[10px] bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white flex items-center justify-center font-bold text-base shadow-md">
            I
          </span>
          <span className="font-bold text-lg tracking-tight hidden xs:block sm:block">
            Ijara<span className="text-primary">.uz</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/elonlar"
            className={`transition-colors ${
              active("/elonlar")
                ? "text-primary font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            E&apos;lonlar
          </Link>
          <Link
            href="/xarita"
            className={`flex items-center gap-1 transition-colors ${
              active("/xarita")
                ? "text-primary font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            <MapPin size={15} /> Xarita
          </Link>
          {user?.role === "moderator" || user?.role === "admin" ? (
            <Link
              href="/moderatsiya"
              className="text-muted hover:text-foreground transition-colors"
            >
              Moderatsiya
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/elon-joylash"
            className="hidden sm:flex items-center gap-1.5 btn btn-primary px-4 py-2 text-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            E&apos;lon berish
          </Link>

          {loading ? null : user ? (
            <div className="flex items-center gap-0.5">
              <Link
                href="/xabarlar"
                className="p-2 rounded-lg hover:bg-[rgba(118,118,128,0.1)] text-muted transition-colors relative"
                title="Xabarlar"
              >
                <MessageCircle size={20} />
              </Link>
              <Link
                href="/saqlanganlar"
                className="p-2 rounded-lg hover:bg-[rgba(118,118,128,0.1)] text-muted transition-colors relative"
                title="Saqlanganlar"
              >
                <Heart size={20} />
              </Link>
              <Link
                href="/profil"
                className="p-2 rounded-lg hover:bg-[rgba(118,118,128,0.1)] text-muted transition-colors"
                title="Profil"
              >
                <User size={20} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="hidden sm:block text-sm text-muted hover:text-danger transition-colors px-2"
              >
                Chiqish
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="hidden sm:flex text-sm font-semibold text-foreground hover:text-primary px-2 transition-colors"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="sm:hidden btn btn-primary px-4 py-2 text-sm"
              >
                Kirish
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[var(--border)] safe-bottom">
        <div className="flex items-stretch justify-around h-14">
          {bottomItem("/", "Bosh", <Home size={22} strokeWidth={2.2} />)}
          {bottomItem("/elonlar", "Qidiruv", <Search size={22} strokeWidth={2.2} />)}
          <Link
            href="/elon-joylash"
            className="flex flex-col items-center justify-center -mt-5"
          >
            <span className="w-12 h-12 rounded-full bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white flex items-center justify-center shadow-lg">
              <Plus size={24} strokeWidth={2.5} />
            </span>
            <span className="text-[10px] font-medium text-primary mt-0.5">
              E&apos;lon
            </span>
          </Link>
          {bottomItem("/xabarlar", "Xabarlar", <MessageCircle size={22} strokeWidth={2.2} />)}
          {bottomItem(user ? "/profil" : "/login", "Profil", <User size={22} strokeWidth={2.2} />)}
        </div>
      </nav>
    </header>
  );
}