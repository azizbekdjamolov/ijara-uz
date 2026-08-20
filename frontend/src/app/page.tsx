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
      <section className="relative bg-gradient-to-b from-white to-[#f2f2f7] border-b border-[var(--border)] overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4 animate-fade-in-up">
            <ShieldCheck size={14} />
            AI tekshirilgan e&apos;lonlar
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            Ijaraga uy, kvartira va xona toping
          </h1>
          <p className="mt-3 text-muted text-base md:text-lg animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            O&apos;zbekiston bo&apos;ylab tekshirilgan e&apos;lonlar — tasdiqlangan
            egalar bilan xavfsiz muloqot
          </p>
          <div className="mt-8 flex justify-center">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-accent" />
              AI tekshiruv
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-accent" />
              Tasdiqlangan egalar
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={16} className="text-accent" />
              Xarita bo&apos;yicha qidiruv
            </span>
          </div>
          {stats ? (
            <div className="mt-10 flex flex-wrap justify-center gap-10 text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {[
                { value: stats.active_listings, label: "Faol e'lon" },
                { value: stats.verified_owners, label: "Tasdiqlangan egalar" },
                { value: stats.districts, label: "Tuman" },
              ].map((s) => (
                <div key={s.label} className="card px-6 py-4 min-w-[120px]">
                  <div className="text-2xl font-bold text-foreground">
                    {s.value.toLocaleString("ru-RU")}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-10 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Mashhur tumanlar</h2>
            <Link href="/elonlar" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
              Barchasi <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            {popular.map((area) => (
              <Link
                key={area.district}
                href={`/elonlar?district=${encodeURIComponent(area.district)}`}
                className="card card-press p-4 block"
              >
                <div className="font-semibold text-foreground">{area.district}</div>
                <div className="text-xs text-muted mt-1">
                  {area.count} ta e&apos;lon
                  {area.avg_price
                    ? ` · ${formatPrice(area.avg_price)} dan`
                    : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 mt-12 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Search size={20} className="text-primary" />
            Yangi e&apos;lonlar
          </h2>
          <Link href="/elonlar" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
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