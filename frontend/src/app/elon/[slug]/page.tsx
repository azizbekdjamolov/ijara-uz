"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
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
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-[#9CA3AF]">
        Yuklanmoqda...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-[#DC2626]">
        {error ?? "E'lon topilmadi"}
      </div>
    );
  }

  const property = listing.property;
  const images = listing.images;
  const isOwner = user && user.id === listing.owner.id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {message && (
        <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-lg px-4 py-2 text-sm">
          {message}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-3 flex-wrap">
        <Link href="/" className="hover:text-[#16A34A]">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/elonlar" className="hover:text-[#16A34A]">E'lonlar</Link>
        <span>/</span>
        <span className="text-[#111827] font-medium">{property.district}</span>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        <div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] bg-[#F3F4F6]">
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
                    <span className="absolute top-3 left-3 bg-[#16A34A]/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <ShieldCheck size={13} />
                      Tekshirilgan e'lon
                    </span>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto">
                    {images.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(index)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 ${
                          index === activeImage
                            ? "border-[#16A34A]"
                            : "border-transparent"
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
              <div className="aspect-[4/3] flex items-center justify-center text-[#9CA3AF]">
                Rasm yo'q
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mt-4">
            <h2 className="font-bold mb-3">Tavsif</h2>
            <p className="text-[#374151] whitespace-pre-line text-sm leading-relaxed">
              {property.description || "Tavsif berilmagan"}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mt-4">
            <h2 className="font-bold mb-3">Xususiyatlar</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <Feature label="Turi" value={PROPERTY_TYPE_LABELS[property.property_type] ?? "—"} />
              <Feature label="Xonalar" value={property.rooms ? `${property.rooms} xona` : "—"} />
              <Feature label="Maydon" value={property.area ? `${property.area} m²` : "—"} />
              <Feature label="Qavat" value={property.floor ? `${property.floor}/${property.total_floors ?? "?"}` : "—"} />
              <Feature label="Mebel" value={property.furnished ? "Bor" : "Yo'q"} />
              <Feature label="Konditsioner" value={property.has_ac ? "Bor" : "Yo'q"} />
              <Feature label="Lift" value={property.has_elevator ? "Bor" : "Yo'q"} />
              <Feature label="Internet" value={property.has_internet ? "Bor" : "Yo'q"} />
              <Feature label="Avtoturargoh" value={property.has_parking ? "Bor" : "Yo'q"} />
              <Feature label="Oilali" value={property.family_ok ? "Mumkin" : "Yo'q"} />
              <Feature label="Talabalar" value={property.students_ok ? "Mumkin" : "Yo'q"} />
              <Feature label="Kafolat" value={property.deposit ? formatPrice(property.deposit) : "—"} />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sticky top-20">
            <div className="text-2xl font-bold">{formatPrice(listing.price)}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              oyiga {property.min_rental_months ? `· kamida ${property.min_rental_months} oy` : ""}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-sm text-[#6B7280]">
              <MapPin size={15} />
              {property.district}, {property.city}
              {property.location_accuracy === "approximate" && (
                <span className="text-xs text-[#9CA3AF]">(taxminiy joylashuv)</span>
              )}
            </div>

            {!isOwner && (
              <div className="mt-4 space-y-2">
                {user ? (
                  <button
                    onClick={startChat}
                    className="w-full flex items-center justify-center gap-2 bg-[#16A34A] text-white font-semibold py-2.5 rounded-lg hover:bg-[#15803D]"
                  >
                    <MessageCircle size={18} />
                    Egasi bilan bog'lanish
                  </button>
                ) : (
                  <Link
                    href={`/login?next=/elon/${listing.slug}`}
                    className="w-full block text-center bg-[#16A34A] text-white font-semibold py-2.5 rounded-lg hover:bg-[#15803D]"
                  >
                    Bog'lanish uchun kiring
                  </Link>
                )}
                <button
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className={`w-full flex items-center justify-center gap-2 border font-semibold py-2.5 rounded-lg ${
                    favorite
                      ? "border-[#DC2626] text-[#DC2626]"
                      : "border-[#E5E7EB] text-[#111827] hover:border-[#16A34A] hover:text-[#16A34A]"
                  }`}
                >
                  <Heart size={18} fill={favorite ? "currentColor" : "none"} />
                  {favorite ? "Saqlangan" : "Saqlash"}
                </button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center font-bold text-[#111827]">
                  {(listing.owner.full_name || "E").charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {listing.owner.full_name || "Foydalanuvchi"}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {listing.owner.active_listings} ta faol e'lon
                  </div>
                </div>
              </div>
              {listing.verification.owner_profile_verified && (
                <BadgeCheck size={20} className="text-[#16A34A]" />
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {listing.views} ko'rish
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} /> {formatRelative(listing.published_at)}
              </span>
            </div>

            {listing.verification.risk_reasons.length > 0 && (
              <div className="mt-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3 text-xs text-[#92400E]">
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

function Feature({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#F3F4F6] py-1.5">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}