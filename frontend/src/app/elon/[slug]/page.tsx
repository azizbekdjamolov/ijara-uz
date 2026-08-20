"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import {
  formatPrice,
  formatRelative,
  PROPERTY_TYPE_LABELS,
} from "@/lib/format";
import type { ListingDetail } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function ListingDetailPage() {
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

  const load = useCallback(async () => {
    try {
      const data = await api.get<ListingDetail>(`/listings/by-slug/${slug}/`);
      setListing(data);
      setFavorite(data.is_favorite);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "E'lon topilmadi");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async () => {
    if (!listing) return;
    setFavoriteLoading(true);
    try {
      await api.post(`/listings/favorites/toggle/${listing.id}/`);
      setFavorite((v) => !v);
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : "Xatolik yuz berdi");
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
      setMessage(e instanceof ApiRequestError ? e.message : "Xatolik yuz berdi");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-muted">
        Yuklanmoqda...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-danger">
        {error ?? "E'lon topilmadi"}
      </div>
    );
  }

  const property = listing.property;
  const images = listing.images;
  const isOwner = user && user.id === listing.owner.id;

  const facts = [
    { icon: Building2, label: "Turi", value: PROPERTY_TYPE_LABELS[property.property_type] ?? "—" },
    { icon: Bed, label: "Xonalar", value: property.rooms ? `${property.rooms} xona` : "—" },
    { icon: Ruler, label: "Maydon", value: property.area ? `${property.area} m²` : "—" },
    { icon: MapPin, label: "Qavat", value: property.floor ? `${property.floor}/${property.total_floors ?? "?"}` : "—" },
  ];

  const amenityItems = [
    { label: "Mebel", on: property.furnished },
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
        <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2 text-sm animate-fade-in">
          {message}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted mb-4 flex-wrap animate-fade-in-up">
        <Link href="/" className="hover:text-primary transition-colors">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/elonlar" className="hover:text-primary transition-colors">E&apos;lonlar</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{property.district}</span>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        <div className="min-w-0">
          <div className="card overflow-hidden animate-fade-in-up">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] bg-[rgba(118,118,128,0.08)]">
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
                    <span className="absolute top-3 left-3 bg-accent/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur shadow-sm">
                      <ShieldCheck size={13} />
                      Tekshirilgan e&apos;lon
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
                            ? "border-primary"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={img.thumb ?? img.image}
                          alt={`${listing.title} — rasm ${index + 1}`}
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
                Rasm yo&apos;q
              </div>
            )}
          </div>

          <div className="card p-4 mt-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <h2 className="font-bold mb-3 text-lg">Tavsif</h2>
            <p className="text-foreground/70 whitespace-pre-line text-sm leading-relaxed">
              {property.description || "Tavsif berilmagan"}
            </p>
          </div>

          <div className="card p-4 mt-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-bold mb-3 text-lg">Xususiyatlar</h2>
            <div className="grid grid-cols-2 gap-3">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 py-2">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
                      ? "bg-accent/10 text-[#1a7f3d]"
                      : "bg-[rgba(118,118,128,0.08)] text-muted"
                  }`}
                >
                  {a.label}
                </span>
              ))}
              {property.deposit && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  Kafolat: {formatPrice(property.deposit)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="card p-5 sticky top-20 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            <div className="text-2xl font-bold text-foreground">{formatPrice(listing.price)}</div>
            <div className="text-xs text-muted mt-0.5">
              oyiga{property.min_rental_months ? ` · kamida ${property.min_rental_months} oy` : ""}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={15} />
              {property.district}, {property.city}
              {property.location_accuracy === "approximate" && (
                <span className="text-xs text-muted">(taxminiy joylashuv)</span>
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
                    Egasi bilan bog&apos;lanish
                  </button>
                ) : (
                  <Link
                    href={`/login?next=/elon/${listing.slug}`}
                    className="btn btn-primary w-full py-3 text-sm"
                  >
                    Bog&apos;lanish uchun kiring
                  </Link>
                )}
                <button
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className={`btn w-full py-3 text-sm border ${
                    favorite
                      ? "border-danger text-danger bg-danger/5"
                      : "border-[var(--border)] text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <Heart size={18} fill={favorite ? "currentColor" : "none"} />
                  {favorite ? "Saqlangan" : "Saqlash"}
                </button>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#0a84ff] to-[#007aff] text-white flex items-center justify-center font-bold">
                  {(listing.owner.full_name || "E").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {listing.owner.full_name || "Foydalanuvchi"}
                  </div>
                  <div className="text-xs text-muted">
                    {listing.owner.active_listings} ta faol e&apos;lon
                  </div>
                </div>
              </div>
              {listing.verification.owner_profile_verified && (
                <BadgeCheck size={20} className="text-accent" />
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-muted flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {listing.views} ko&apos;rish
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} /> {formatRelative(listing.published_at)}
              </span>
            </div>

            {listing.verification.risk_reasons.length > 0 && (
              <div className="mt-4 bg-[#FFF7E6] border border-[#FFE3A8] rounded-lg p-3 text-xs text-[#8a5a00]">
                <div className="font-semibold mb-1">Eslatma</div>
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
    </div>
  );
}