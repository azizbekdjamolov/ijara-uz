"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";

import { formatCompactPrice, PROPERTY_TYPE_LABELS } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  const image = listing.primary_image?.thumb ?? listing.primary_image?.image;
  return (
    <Link
      href={`/elon/${listing.slug}`}
      className="group card card-press overflow-hidden block animate-fade-in-up"
    >
      <div className="relative aspect-[4/3] bg-[rgba(255,255,255,0.05)] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.07]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
            Rasm yo&apos;q
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090f]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {listing.is_favorite && (
          <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#12162a]/80 backdrop-blur flex items-center justify-center border border-[rgba(212,175,55,0.3)] animate-scale-in">
            <Heart size={16} className="text-gold" fill="currentColor" />
          </span>
        )}
        {listing.risk_level === "low" && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.4)] text-gold">
            Tekshirilgan
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="display font-bold text-lg bg-gradient-to-r from-[#f2d98d] to-[#d4af37] bg-clip-text text-transparent">
          {formatCompactPrice(listing.price)}
        </div>
        <div className="text-[13px] text-foreground/75 truncate mt-1">
          {listing.title}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(212,175,55,0.12)] text-xs text-muted">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {listing.property.district}
          </span>
          <span>
            {PROPERTY_TYPE_LABELS[listing.property.property_type] ?? ""}
            {listing.property.rooms
              ? ` · ${listing.property.rooms} xona`
              : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}