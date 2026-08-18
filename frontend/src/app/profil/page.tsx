"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-[#9CA3AF]">
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) return null;

  const statusColor: Record<string, string> = {
    published: "bg-[#16A34A]/10 text-[#16A34A]",
    pending_review: "bg-[#F59E0B]/10 text-[#B45309]",
    ai_checking: "bg-[#F59E0B]/10 text-[#B45309]",
    needs_review: "bg-[#F59E0B]/10 text-[#B45309]",
    rejected: "bg-[#DC2626]/10 text-[#DC2626]",
    paused: "bg-[#6B7280]/10 text-[#6B7280]",
    expired: "bg-[#6B7280]/10 text-[#6B7280]",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xl font-bold">
            {(user.full_name || "F").charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{user.full_name || "Foydalanuvchi"}</h1>
            <div className="text-sm text-[#6B7280]">{user.phone}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {user.is_phone_verified && (
                <span className="bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-full font-medium">
                  Telefon tasdiqlangan
                </span>
              )}
              {user.is_profile_verified && (
                <span className="bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-full font-medium">
                  Profil tasdiqlangan
                </span>
              )}
              {!user.is_phone_verified && (
                <span className="bg-[#F59E0B]/10 text-[#B45309] px-2 py-0.5 rounded-full font-medium">
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
            className="text-sm text-[#6B7280] hover:text-[#DC2626]"
          >
            Chiqish
          </button>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-[#E5E7EB]">
          <Link href="/saqlanganlar" className="text-sm font-medium text-[#16A34A] hover:underline">
            Saqlanganlar
          </Link>
          <Link href="/xabarlar" className="text-sm font-medium text-[#16A34A] hover:underline">
            Xabarlar
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Mening e'lonlarim</h2>
        <Link
          href="/elon-joylash"
          className="flex items-center gap-1.5 bg-[#16A34A] text-white text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-[#15803D]"
        >
          <Plus size={15} /> Yangi e'lon
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-20 h-16 rounded-lg bg-[#F3F4F6] shrink-0 overflow-hidden">
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
              <div className="text-sm text-[#6B7280]">
                {Number(listing.price).toLocaleString("ru-RU")} so'm/oy
              </div>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  statusColor[listing.status] ?? "bg-[#F3F4F6] text-[#6B7280]"
                }`}
              >
                {STATUS_LABELS[listing.status] ?? listing.status}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <Link
                href={`/elon/${listing.slug}`}
                className="text-xs text-[#16A34A] font-medium hover:underline"
              >
                Ko'rish
              </Link>
            </div>
          </div>
        ))}
        {!listingsLoading && listings.length === 0 && (
          <div className="text-center py-10 text-[#9CA3AF]">
            Hozircha e'lonlaringiz yo'q.
            <Link href="/elon-joylash" className="block mt-2 text-[#16A34A] font-medium">
              Birinchi e'lonni joylash
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}