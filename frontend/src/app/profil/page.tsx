"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, User as UserIcon } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { STATUS_LABELS } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      const data = await api.get<{ count: number; results: ListingSummary[] }>(
        "/listings/mine/?page_size=50"
      );
      setListings(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Xatolik");
    } finally {
      setListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/profil");
      return;
    }
    loadListings();
  }, [user, loading, router, loadListings]);

  if (loading || (user && listingsLoading)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted">
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) return null;

  const statusColor: Record<string, string> = {
    published: "bg-accent/10 text-[#1a7f3d]",
    pending_review: "bg-[#FF9500]/10 text-[#b65f00]",
    ai_checking: "bg-[#FF9500]/10 text-[#b65f00]",
    needs_review: "bg-[#FF9500]/10 text-[#b65f00]",
    rejected: "bg-danger/10 text-danger",
    paused: "bg-[rgba(118,118,128,0.12)] text-muted",
    expired: "bg-[rgba(118,118,128,0.12)] text-muted",
  };

  const initials = (user.full_name || "F").charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="card p-6 mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white flex items-center justify-center text-2xl font-bold shadow-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">
              {user.full_name || "Foydalanuvchi"}
            </h1>
            <div className="text-sm text-muted">
              {user.phone ?? (user.telegram_username ? `@${user.telegram_username}` : "")}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
              {user.is_phone_verified && (
                <span className="bg-accent/10 text-[#1a7f3d] px-2 py-0.5 rounded-full font-medium">
                  Telefon tasdiqlangan
                </span>
              )}
              {user.is_profile_verified && (
                <span className="bg-accent/10 text-[#1a7f3d] px-2 py-0.5 rounded-full font-medium">
                  Profil tasdiqlangan
                </span>
              )}
              {user.telegram_username && (
                <span className="bg-[#229ed9]/10 text-[#17708f] px-2 py-0.5 rounded-full font-medium">
                  Telegram
                </span>
              )}
              {!user.is_phone_verified && !user.telegram_username && (
                <span className="bg-[#FF9500]/10 text-[#b65f00] px-2 py-0.5 rounded-full font-medium">
                  Telefonni tasdiqlang
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="btn btn-secondary p-2.5 text-muted hover:text-danger"
            title="Chiqish"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <Link href="/saqlanganlar" className="btn btn-secondary text-sm py-2.5">
            Saqlanganlar
          </Link>
          <Link href="/xabarlar" className="btn btn-secondary text-sm py-2.5">
            Xabarlar
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Mening e&apos;lonlarim</h2>
        <Link
          href="/elon-joylash"
          className="btn btn-primary text-sm px-4 py-2"
        >
          <Plus size={15} /> Yangi e&apos;lon
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-2 stagger">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="card p-3 flex items-center gap-3"
          >
            <div className="w-20 h-16 rounded-lg bg-[rgba(118,118,128,0.08)] shrink-0 overflow-hidden">
              {listing.primary_image?.thumb && (
                <Image
                  src={listing.primary_image.thumb}
                  alt=""
                  width={160}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate text-sm">{listing.title}</div>
              <div className="text-sm text-muted">
                {Number(listing.price).toLocaleString("ru-RU")} so&apos;m/oy
              </div>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  statusColor[listing.status] ?? "bg-[rgba(118,118,128,0.12)] text-muted"
                }`}
              >
                {STATUS_LABELS[listing.status] ?? listing.status}
              </span>
            </div>
            <Link
              href={`/elon/${listing.slug}`}
              className="btn btn-secondary text-xs py-2 px-3"
            >
              Ko&apos;rish
            </Link>
          </div>
        ))}
        {!listingsLoading && listings.length === 0 && (
          <div className="text-center py-10 text-muted animate-fade-in">
            <UserIcon size={40} className="mx-auto mb-3" />
            Hozircha e&apos;lonlaringiz yo&apos;q.
            <Link href="/elon-joylash" className="block mt-2 text-primary font-semibold">
              Birinchi e&apos;lonni joylash
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}