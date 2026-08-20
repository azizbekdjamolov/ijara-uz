import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck } from "lucide-react";

import { API_URL, type ListingSummary, type PlatformStats, type PopularArea } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import SearchBar from "@/components/SearchBar";

export const revalidate = 60;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [areas, stats, listings] = await Promise.all([
    fetchJson<PopularArea[]>("/search/popular-areas/"),
    fetchJson<PlatformStats>("/analytics/platform/"),
    fetchJson<{ results: ListingSummary[] }>(
      "/search/listings/?sort=newest&page_size=8"
    ),
  ]);

  const newListings = listings?.results ?? [];
  const popular = areas?.slice(0, 8) ?? [];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[rgba(212,175,55,0.06)] blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] px-4 py-1.5 rounded-full mb-6 animate-fade-in-up backdrop-blur">
            <ShieldCheck size={14} />
            AI tekshirilgan e&apos;lonlar
          </span>
          <h1 className="display text-4xl md:text-6xl font-bold text-foreground leading-tight tracking-tight animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            Ijaraga uy, kvartira va xona{" "}
            <span className="bg-gradient-to-r from-[#f2d98d] via-[#d4af37] to-[#b3902a] bg-clip-text text-transparent">
              toping
            </span>
          </h1>
          <p className="mt-4 text-muted text-base md:text-lg max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            O&apos;zbekiston bo&apos;ylab tekshirilgan e&apos;lonlar — tasdiqlangan
            egalar bilan xavfsiz muloqot
          </p>
          <div className="mt-9 flex justify-center">
            <SearchBar />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-gold" />
              AI tekshiruv
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-gold" />
              Tasdiqlangan egalar
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={16} className="text-gold" />
              Xarita bo&apos;yicha qidiruv
            </span>
          </div>
          {stats ? (
            <div className="mt-12 flex flex-wrap justify-center gap-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {[
                { value: stats.active_listings, label: "Faol e'lon" },
                { value: stats.verified_owners, label: "Tasdiqlangan egalar" },
                { value: stats.districts, label: "Tuman" },
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
            <h2 className="display text-2xl font-bold">Mashhur tumanlar</h2>
            <Link href="/elonlar" className="flex items-center gap-1 text-sm text-gold font-semibold hover:text-gold-light transition-colors">
              Barchasi <ArrowRight size={15} />
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
                  {area.count} ta e&apos;lon
                  {area.avg_price
                    ? ` · ${formatPrice(area.avg_price)} dan`
                    : ""}
                </div>
                <div className="gold-line mt-3" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 mt-14 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="display text-2xl font-bold flex items-center gap-2.5">
            <Search size={22} className="text-gold" />
            Yangi e&apos;lonlar
          </h2>
          <Link href="/elonlar" className="flex items-center gap-1 text-sm text-gold font-semibold hover:text-gold-light transition-colors">
            Hammasini ko&apos;rish <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {newListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        {newListings.length === 0 && (
          <div className="text-center py-10 text-muted">
            Hozircha e&apos;lonlar yo&apos;q
          </div>
        )}
      </section>
    </div>
  );
}