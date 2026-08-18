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
      className="group bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-[#F3F4F6]">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-[1.02] transition-transform"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#9CA3AF] text-sm">
            Rasm yo'q
          </div>
        )}
        {listing.is_favorite && (
          <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <Heart size={16} className="text-[#DC2626]" fill="currentColor" />
          </span>
        )}
        {listing.risk_level === "low" && (
          <span className="absolute top-2 left-2 bg-[#16A34A]/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            Tekshirilgan
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-[#111827] text-[15px]">
          {formatCompactPrice(listing.price)}
        </div>
        <div className="text-[13px] text-[#374151] truncate mt-0.5">
          {listing.title}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-[#6B7280]">
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