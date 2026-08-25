"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { BadgeCheck, Calendar, MapPin, User as UserIcon } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import type { ListingSummary } from "@/lib/types";
import ListingCard from "@/components/ListingCard";

interface PublicProfile {
  id: string;
  full_name: string;
  avatar: string | null;
  telegram_username: string | null;
  is_phone_verified: boolean;
  is_profile_verified: boolean;
  member_since: string | null;
  active_listings_count: number;
  city: string | null;
  role: string;
}

export default function PublicProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileData, listingsData] = await Promise.all([
        api.get<PublicProfile>(`/auth/users/${id}/`),
        api.get<{ count: number; results: ListingSummary[] }>(
          `/listings/mine/?user_id=${id}&page_size=50`
        ),
      ]);
      setProfile(profileData);
      setListings(listingsData.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-danger">
        {error ?? t("common.error")}
      </div>
    );
  }

  const initials = (profile.full_name || "F").charAt(0).toUpperCase();
  const joinedDate = profile.member_since
    ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(profile.member_since)
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Profile Header */}
      <div className="card p-6 mb-8 animate-fade-in-up">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {profile.full_name || "Foydalanuvchi"}
              {profile.is_profile_verified && (
                <BadgeCheck size={22} className="text-gold shrink-0" />
              )}
            </h1>
            <div className="text-sm text-muted mt-1 space-y-0.5">
              {profile.telegram_username && (
                <div>@{profile.telegram_username}</div>
              )}
              {profile.city && (
                <div className="flex items-center gap-1">
                  <MapPin size={13} />
                  {profile.city}
                </div>
              )}
              {joinedDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={13} />
                  {t("listingDetail.memberSince")} {joinedDate}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {profile.is_phone_verified && (
                <span className="bg-[rgba(52,211,153,0.12)] text-[#059669] px-2 py-0.5 rounded-full font-medium">
                  {t("profile.phoneVerified")}
                </span>
              )}
              {profile.is_profile_verified && (
                <span className="bg-[rgba(52,211,153,0.12)] text-[#059669] px-2 py-0.5 rounded-full font-medium">
                  {t("profile.profileVerified")}
                </span>
              )}
              {profile.telegram_username && (
                <span className="bg-[rgba(34,158,217,0.12)] text-[#17708f] px-2 py-0.5 rounded-full font-medium">
                  {t("profile.telegram")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-sm text-muted">
            {t("listingDetail.activeListings", { count: profile.active_listings_count })}
          </div>
        </div>
      </div>

      {/* User's Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("profile.myListings")}</h2>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-10 text-muted animate-fade-in">
          <UserIcon size={40} className="mx-auto mb-3" />
          {t("profile.noListings")}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
