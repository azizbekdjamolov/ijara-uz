"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck } from "lucide-react";

import type { ListingSummary, PlatformStats, PopularArea } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import SearchBar from "@/components/SearchBar";

interface Props {
  newListings: ListingSummary[];
  popular: PopularArea[];
  stats: PlatformStats | null;
}

export default function HomePageClient({ newListings, popular, stats }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[rgba(212,175,55,0.06)] blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] px-4 py-1.5 rounded-full mb-6 animate-fade-in-up backdrop-blur">
            <ShieldCheck size={14} />
            {t("hero.badge")}
          </span>
          <h1 className="display text-4xl md:text-6xl font-bold text-foreground leading-tight tracking-tight animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            {t("hero.title1")}{" "}
            <span className="bg-gradient-to-r from-[#f2d98d] via-[#d4af37] to-[#b3902a] bg-clip-text text-transparent">
              {t("hero.titleHighlight")}
            </span>
          </h1>
          <p className="mt-4 text-muted text-base md:text-lg max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {t("hero.subtitle")}
          </p>
          <div className="mt-9 flex justify-center">
            <SearchBar />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-gold" />
              {t("hero.aiCheck")}
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-gold" />
              {t("hero.verifiedOwners")}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={16} className="text-gold" />
              {t("hero.mapSearch")}
            </span>
          </div>
          {stats ? (
            <div className="mt-12 flex flex-wrap justify-center gap-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {[
                { value: stats.active_listings, label: t("stats.activeListings") },
                { value: stats.verified_owners, label: t("stats.verifiedOwners") },
                { value: stats.districts, label: t("stats.districts") },
              ].map((s) => (
                <div key={s.label} className="card px-8 py-5 min-w-[140px]">
                  <div className="display text-3xl font-bold bg-gradient-to-r from-[#f2d98d] to-[#d4af37] bg-clip-text text-transparent">
                    {s.value.toLocaleString("ru-RU")}
                  </div>
                  <div className="text-xs text-muted mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="gold-line max-w-3xl mx-auto" />
      </section>

      {popular.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="display text-2xl font-bold">{t("popularAreas.title")}</h2>
            <Link href="/elonlar" className="flex items-center gap-1 text-sm text-gold font-semibold hover:text-gold-light transition-colors">
              {t("common.seeAll")} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            {popular.map((area) => (
              <Link
                key={area.district}
                href={`/elonlar?district=${encodeURIComponent(area.district)}`}
                className="card card-press p-5 block"
              >
                <div className="font-semibold text-foreground">{area.district}</div>
                <div className="text-xs text-muted mt-1.5">
                  {t("popularAreas.listingsCount", { count: area.count })}
                  {area.avg_price
                    ? ` · ${t("popularAreas.fromPrice", { price: formatPrice(area.avg_price) })}`
                    : ""}
                </div>
                <div className="gold-line mt-3" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 mt-14 pb-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="display text-2xl font-bold flex items-center gap-2.5">
            <Search size={22} className="text-gold" />
            {t("newListings.title")}
          </h2>
          <Link href="/elonlar" className="flex items-center gap-1 text-sm text-gold font-semibold hover:text-gold-light transition-colors">
            {t("common.seeAll")} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {newListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        {newListings.length === 0 && (
          <div className="text-center py-10 text-muted">
            {t("newListings.empty")}
          </div>
        )}
      </section>
    </div>
  );
}
