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
      <div className="relative aspect-[4/3] bg-[rgba(118,118,128,0.08)] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
            Rasm yo&apos;q
          </div>
        )}
        {listing.is_favorite && (
          <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm animate-scale-in">
            <Heart size={16} className="text-danger" fill="currentColor" />
          </span>
        )}
        {listing.risk_level === "low" && (
          <span className="absolute top-2 left-2 bg-accent/90 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur">
            Tekshirilgan
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-foreground text-[15px]">
          {formatCompactPrice(listing.price)}
        </div>
        <div className="text-[13px] text-foreground/70 truncate mt-0.5">
          {listing.title}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-muted">
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