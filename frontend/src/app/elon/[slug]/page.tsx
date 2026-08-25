"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Bed,
  Calendar,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Flag,
} from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import {
  formatPrice,
  formatRelative,
  PROPERTY_TYPE_LABELS,
} from "@/lib/format";
import type { ListingDetail } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import ReportModal from "@/components/ReportModal";

export default function ListingDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ListingDetail>(`/listings/by-slug/${slug}/`);
      setListing(data);
      setFavorite(data.is_favorite);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async () => {
    if (!listing) return;
    if (!user) {
      router.push(`/login?next=/elon/${listing.slug}`);
      return;
    }
    setFavoriteLoading(true);
    try {
      await api.post(`/listings/favorites/toggle/${listing.id}/`);
      setFavorite((v) => !v);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) {
        router.push(`/login?next=/elon/${listing.slug}`);
        return;
      }
      setMessage(e instanceof ApiRequestError ? e.message : t("common.error"));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const startChat = async () => {
    if (!listing || !user) return;
    try {
      await api.post("/chat/conversations/", { listing_id: listing.id });
      router.push("/xabarlar");
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : t("common.error"));
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-muted">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-danger">
        {error ?? t("common.error")}
      </div>
    );
  }

  const property = listing.property;
  const images = listing.images;
  const isOwner = user && user.id === listing.owner.id;

  const facts = [
    { icon: Building2, label: t("listingDetail.propertyInfo"), value: PROPERTY_TYPE_LABELS[property.property_type] ?? "—" },
    { icon: Bed, label: t("listingsPage.rooms"), value: property.rooms ? `${property.rooms} ${t("listingsPage.rooms").toLowerCase()}` : "—" },
    { icon: Ruler, label: t("listingDetail.propertyInfo"), value: property.area ? `${property.area} m²` : "—" },
    { icon: MapPin, label: t("listingDetail.location"), value: property.floor ? `${property.floor}/${property.total_floors ?? "?"}` : "—" },
  ];

  const amenityItems = [
    { label: t("listingDetail.furnishedLabel"), on: property.furnished },
    { label: "Konditsioner", on: property.has_ac },
    { label: "Lift", on: property.has_elevator },
    { label: "Internet", on: property.has_internet },
    { label: "Avtoturargoh", on: property.has_parking },
    { label: "Oilali", on: property.family_ok },
    { label: "Talabalar", on: property.students_ok },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {message && (
        <div className="mb-4 bg-[rgba(255,107,94,0.1)] border border-[rgba(255,107,94,0.3)] text-danger rounded-lg px-4 py-2 text-sm animate-fade-in">
          {message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted mb-4 flex-wrap animate-fade-in-up">
        <Link href="/" className="hover:text-gold transition-colors">{t("nav.home")}</Link>
        <span>/</span>
        <Link href="/elonlar" className="hover:text-gold transition-colors">{t("nav.listings")}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{property.district}</span>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        <div className="min-w-0">
          {/* Image Gallery */}
          <div className="card overflow-hidden animate-fade-in-up">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] bg-[var(--surface-strong)]">
                  <Image
                    src={images[activeImage].image}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                    unoptimized
                    priority
                  />
                  {listing.verification.listing_checked && (
                    <span className="absolute top-3 left-3 bg-[rgba(212,175,55,0.15)]/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur shadow-sm">
                      <ShieldCheck size={13} />
                      {t("listingCard.verified")}
                    </span>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar">
                    {images.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(index)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          index === activeImage
                            ? "border-[rgba(212,175,55,0.6)]"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={img.thumb ?? img.image}
                          alt={`${listing.title} — ${index + 1}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center text-muted">
                {t("listingCard.noImage")}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="card p-4 mt-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <h2 className="font-bold mb-3 text-lg">{t("listingDetail.propertyInfo")}</h2>
            <p className="text-foreground/70 whitespace-pre-line text-sm leading-relaxed">
              {property.description || t("listingDetail.amenities")}
            </p>
          </div>

          {/* Property Facts & Amenities */}
          <div className="card p-4 mt-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-bold mb-3 text-lg">{t("listingDetail.amenities")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 py-2">
                  <span className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.1)] text-gold flex items-center justify-center shrink-0">
                    <f.icon size={17} />
                  </span>
                  <div>
                    <div className="text-[11px] text-muted">{f.label}</div>
                    <div className="font-medium text-sm">{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">
              {amenityItems.map((a) => (
                <span
                  key={a.label}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    a.on
                      ? "bg-[rgba(52,211,153,0.12)] text-[#059669]"
                      : "bg-[var(--surface-strong)] text-muted"
                  }`}
                >
                  {a.label}
                </span>
              ))}
              {property.deposit && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[rgba(212,175,55,0.12)] text-gold">
                  {t("listingDetail.depositLabel")}: {formatPrice(property.deposit)}
                </span>
              )}
            </div>
          </div>

          {/* ===== OWNER PROFILE CARD ===== */}
          <div className="card p-5 mt-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-bold mb-4 text-lg">{t("listingDetail.owner")}</h2>
            <Link
              href={`/profil/${listing.owner.id}`}
              className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--border)] hover:border-[rgba(212,175,55,0.4)] hover:shadow-[var(--shadow-md)] transition-all group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#e8c869] to-[#b3902a] text-[#1a1405] flex items-center justify-center font-bold text-xl shrink-0 group-hover:shadow-[0_4px_16px_rgba(212,175,55,0.3)] transition-shadow">
                {(listing.owner.full_name || "E").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">
                    {listing.owner.full_name || "Foydalanuvchi"}
                  </span>
                  {listing.verification.owner_profile_verified && (
                    <BadgeCheck size={18} className="text-gold shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted mt-1 space-y-0.5">
                  {listing.owner.member_since && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {t("listingDetail.memberSince")}{" "}
                      {new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric" }).format(
                        new Date(listing.owner.member_since)
                      )}
                    </div>
                  )}
                  <div>
                    {t("listingDetail.activeListings", { count: listing.owner.active_listings })}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gold font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                {t("common.view")} →
              </span>
            </Link>
          </div>
        </div>

        {/* ===== SIDEBAR ===== */}
        <div className="min-w-0">
          <div className="card p-5 sticky top-20 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            <div className="text-2xl font-bold text-foreground">{formatPrice(listing.price)}</div>
            <div className="text-xs text-muted mt-0.5">
              {t("listingsPage.priceFrom").replace("Narx ", "").replace("Цена ", "").replace("Price ", "") || "oyiga"}
              {property.min_rental_months ? ` · ${t("listingDetail.minRentLabel")}: ${property.min_rental_months} ${t("listingDetail.months")}` : ""}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={15} />
              {property.district}, {property.city}
              {property.location_accuracy === "approximate" && (
                <span className="text-xs text-muted">(taxminiy)</span>
              )}
            </div>

            {!isOwner && (
              <div className="mt-5 space-y-2.5">
                {user ? (
                  <button
                    onClick={startChat}
                    className="btn btn-primary w-full py-3 text-sm"
                  >
                    <MessageCircle size={18} />
                    {t("listingDetail.contact")}
                  </button>
                ) : (
                  <Link
                    href={`/login?next=/elon/${listing.slug}`}
                    className="btn btn-primary w-full py-3 text-sm"
                  >
                    {t("nav.login")}
                  </Link>
                )}
                <button
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className={`btn w-full py-3 text-sm border ${
                    favorite
                      ? "border-danger text-danger bg-danger/5"
                      : "border-[var(--border)] text-foreground hover:border-[rgba(212,175,55,0.6)] hover:text-gold"
                  }`}
                >
                  <Heart size={18} fill={favorite ? "currentColor" : "none"} />
                  {favorite ? t("listingDetail.unfavorite") : t("listingDetail.favorite")}
                </button>
                {user && !isOwner && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="btn btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2"
                  >
                    <Flag size={18} />
                    {t("listingDetail.report")}
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-muted flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {listing.views} {t("listingDetail.views").toLowerCase()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} /> {formatRelative(listing.published_at)}
              </span>
            </div>

            {listing.verification.risk_reasons.length > 0 && (
              <div className="mt-4 bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.3)] rounded-lg p-3 text-xs text-[#b45309]">
                <div className="font-semibold mb-1">{t("listingDetail.report")}</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {listing.verification.risk_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportModal listingId={listing.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
