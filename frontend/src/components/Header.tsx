"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MapPin, MessageCircle, Plus, User } from "lucide-react";

import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItem = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-0.5 text-[11px] font-medium ${
          active ? "text-[#16A34A]" : "text-[#6B7280] hover:text-[#111827]"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">
            I
          </span>
          <span className="font-bold text-lg tracking-tight hidden xs:block sm:block">
            Ijara<span className="text-[#16A34A]">.uz</span>
          </span>
        </Link>

        <Link
          href="/xarita"
          className="hidden md:flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827]"
        >
          <MapPin size={16} />
          Xaritada qidirish
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link href="/elonlar" className={pathname.startsWith("/elonlar") ? "text-[#16A34A]" : "text-[#6B7280] hover:text-[#111827]"}>
            E'lonlar
          </Link>
          {user?.role === "moderator" || user?.role === "admin" ? (
            <Link
              href="/moderatsiya"
              className="text-[#6B7280] hover:text-[#111827]"
            >
              Moderatsiya
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/elon-joylash"
            className="hidden sm:flex items-center gap-1.5 bg-[#16A34A] text-white text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-[#15803D]"
          >
            <Plus size={16} />
            E'lon berish
          </Link>

          {loading ? null : user ? (
            <div className="flex items-center gap-1">
              <Link
                href="/xabarlar"
                className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"
                title="Xabarlar"
              >
                <MessageCircle size={20} />
              </Link>
              <Link
                href="/profil"
                className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"
                title="Profil"
              >
                <User size={20} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="hidden sm:block text-sm text-[#6B7280] hover:text-[#DC2626] px-2"
              >
                Chiqish
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-[#111827] hover:text-[#16A34A] px-2"
            >
              Kirish
            </Link>
          )}
        </div>
      </div>

      <nav className="md:hidden flex items-center justify-around border-t border-[#E5E7EB] bg-white h-12">
        {navItem("/", "Bosh sahifa", <Home size={18} />)}
        {navItem("/elonlar", "E'lonlar", <MapPin size={18} />)}
        {navItem("/elon-joylash", "E'lon berish", <Plus size={18} />)}
        {navItem("/xabarlar", "Xabarlar", <MessageCircle size={18} />)}
        {navItem(user ? "/profil" : "/login", "Profil", <User size={18} />)}
      </nav>
    </header>
  );
}