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
          isActive ? "text-gold" : "text-muted hover:text-foreground"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#07090f]/80 backdrop-blur-xl border-b border-[rgba(212,175,55,0.15)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-serif font-bold text-lg shadow-[0_4px_16px_rgba(212,175,55,0.4)] group-hover:shadow-[0_6px_24px_rgba(212,175,55,0.55)] transition-shadow">
            I
          </span>
          <span className="font-serif font-bold text-xl tracking-tight hidden xs:block sm:block text-foreground">
            Ijara<span className="text-gold">.uz</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <Link
            href="/elonlar"
            className={`transition-colors ${
              active("/elonlar")
                ? "text-gold font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            E&apos;lonlar
          </Link>
          <Link
            href="/xarita"
            className={`flex items-center gap-1 transition-colors ${
              active("/xarita")
                ? "text-gold font-semibold"
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
            className="hidden sm:flex items-center gap-1.5 btn btn-primary px-4.5 py-2 text-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            E&apos;lon berish
          </Link>

          {loading ? null : user ? (
            <div className="flex items-center gap-0.5">
              <Link
                href="/xabarlar"
                className="p-2 rounded-lg hover:bg-white/5 text-muted transition-colors relative"
                title="Xabarlar"
              >
                <MessageCircle size={20} />
              </Link>
              <Link
                href="/saqlanganlar"
                className="p-2 rounded-lg hover:bg-white/5 text-muted transition-colors relative"
                title="Saqlanganlar"
              >
                <Heart size={20} />
              </Link>
              <Link
                href="/profil"
                className="p-2 rounded-lg hover:bg-white/5 text-muted transition-colors"
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
                className="hidden sm:flex text-sm font-semibold text-foreground hover:text-gold px-2 transition-colors"
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e1c]/90 backdrop-blur-xl border-t border-[rgba(212,175,55,0.15)] safe-bottom">
        <div className="flex items-stretch justify-around h-16">
          {bottomItem("/", "Bosh", <Home size={22} strokeWidth={2.2} />)}
          {bottomItem("/elonlar", "Qidiruv", <Search size={22} strokeWidth={2.2} />)}
          <Link
            href="/elon-joylash"
            className="flex flex-col items-center justify-center -mt-6"
          >
            <span className="w-13 h-13 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.45)]">
              <Plus size={24} strokeWidth={2.5} />
            </span>
            <span className="text-[10px] font-medium text-gold mt-0.5">
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