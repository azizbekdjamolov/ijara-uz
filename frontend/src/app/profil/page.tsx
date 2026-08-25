"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Check, LogOut, Pencil, Plus, Save, User as UserIcon, X } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getStatusLabel } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      const data = await api.get<{ count: number; results: ListingSummary[] }>(
        "/listings/mine/?page_size=50"
      );
      setListings(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setListingsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/profil");
      return;
    }
    loadListings();
  }, [user, loading, router, loadListings]);

  const startEditing = () => {
    if (!user) return;
    setEditName(user.full_name || "");
    setEditPhone(user.phone || "");
    setEditCity(user.city || "");
    setEditing(true);
    setSaved(false);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditError(null);
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      setEditError(t("register.nameError"));
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await api.patch("/auth/me/", {
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        city: editCity.trim() || null,
      });
      await refreshUser();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setEditError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || (user && listingsLoading)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) return null;

  const statusColor: Record<string, string> = {
    published: "bg-[rgba(52,211,153,0.15)] text-[#059669]",
    pending_review: "bg-[rgba(251,191,36,0.15)] text-[#b45309]",
    ai_checking: "bg-[rgba(251,191,36,0.15)] text-[#b45309]",
    needs_review: "bg-[rgba(251,191,36,0.15)] text-[#b45309]",
    rejected: "bg-[rgba(255,107,94,0.15)] text-danger",
    paused: "bg-[rgba(118,118,128,0.12)] text-muted",
    expired: "bg-[rgba(118,118,128,0.12)] text-muted",
  };

  const initials = (user.full_name || "F").charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Profile Card */}
      <div className="card p-6 mb-6 animate-fade-in-up">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center text-2xl font-bold shadow-lg shrink-0">
            {user.avatar ? (
              <Image src={user.avatar} alt="" width={64} height={64} className="w-full h-full rounded-full object-cover" unoptimized />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">{t("profile.fullName")}</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">{t("profile.phone")}</label>
                  <input
                    value={editPhone}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9+]/g, "");
                      v = v.replace(/(?!^)\+/g, "");
                      if (v.startsWith("+")) v = "+" + v.slice(1).replace(/\+/g, "");
                      if (v.length > 13) v = v.slice(0, 13);
                      setEditPhone(v);
                    }}
                    placeholder="+998901234567"
                    inputMode="tel"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">{t("profile.city")}</label>
                  <input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Toshkent"
                    className="input text-sm"
                  />
                </div>
                {editError && (
                  <div className="text-xs text-danger bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] rounded-lg px-3 py-2">
                    {editError}
                  </div>
                )}
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold truncate">
                  {user.full_name || t("nav.profile")}
                </h1>
                <div className="text-sm text-muted">
                  {user.phone ?? (user.telegram_username ? `@${user.telegram_username}` : "")}
                  {user.city ? ` · ${user.city}` : ""}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                  {user.is_phone_verified && (
                    <span className="bg-[rgba(52,211,153,0.12)] text-[#059669] px-2 py-0.5 rounded-full font-medium">
                      {t("profile.phoneVerified")}
                    </span>
                  )}
                  {user.is_profile_verified && (
                    <span className="bg-[rgba(52,211,153,0.12)] text-[#059669] px-2 py-0.5 rounded-full font-medium">
                      {t("profile.profileVerified")}
                    </span>
                  )}
                  {user.telegram_username && (
                    <span className="bg-[rgba(34,158,217,0.12)] text-[#17708f] px-2 py-0.5 rounded-full font-medium">
                      {t("profile.telegram")}
                    </span>
                  )}
                  {!user.is_phone_verified && !user.telegram_username && (
                    <span className="bg-[rgba(251,191,36,0.12)] text-[#b45309] px-2 py-0.5 rounded-full font-medium">
                      {t("profile.verifyPhone")}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn btn-primary p-2.5"
                  title={t("profile.save")}
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-[#1a1405]/30 border-t-[#1a1405] rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  className="btn btn-secondary p-2.5 text-muted hover:text-foreground"
                  title={t("common.cancel")}
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="btn btn-secondary p-2.5 text-muted hover:text-gold"
                  title={t("profile.editProfile")}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="btn btn-secondary p-2.5 text-muted hover:text-danger"
                  title={t("nav.logout")}
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {saved && (
          <div className="mt-3 flex items-center gap-2 text-sm text-success animate-scale-in">
            <Check size={16} />
            {t("profile.saved")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <Link href="/saqlanganlar" className="btn btn-secondary text-sm py-2.5">
            {t("profile.savedListings")}
          </Link>
          <Link href="/xabarlar" className="btn btn-secondary text-sm py-2.5">
            {t("profile.messages")}
          </Link>
        </div>
      </div>

      {/* Listings */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{t("profile.myListings")}</h2>
        <Link
          href="/elon-joylash"
          className="btn btn-primary text-sm px-4 py-2"
        >
          <Plus size={15} /> {t("profile.newListing")}
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] text-danger rounded-lg px-4 py-2 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="space-y-2 stagger">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="card p-3 flex items-center gap-3"
          >
            <div className="w-20 h-16 rounded-lg bg-[var(--surface-strong)] shrink-0 overflow-hidden">
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
                {Number(listing.price).toLocaleString(i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ")} {t("format.som")}/{t("listingDetail.months")}
              </div>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  statusColor[listing.status] ?? "bg-[rgba(118,118,128,0.12)] text-muted"
                }`}
              >
                {getStatusLabel(listing.status)}
              </span>
            </div>
            <Link
              href={`/elon/${listing.slug}`}
              className="btn btn-secondary text-xs py-2 px-3"
            >
              {t("common.view")}
            </Link>
          </div>
        ))}
        {!listingsLoading && listings.length === 0 && (
          <div className="text-center py-10 text-muted animate-fade-in">
            <UserIcon size={40} className="mx-auto mb-3" />
            {t("profile.noListings")}
            <Link href="/elon-joylash" className="block mt-2 text-gold font-semibold">
              {t("profile.postFirst")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
