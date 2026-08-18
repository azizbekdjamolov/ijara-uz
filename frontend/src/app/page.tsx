import Link from "next/link";
import { BadgeCheck, MapPin, Search, ShieldCheck } from "lucide-react";

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
      <section className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-[#111827] leading-tight">
            Ijaraga uy, kvartira va xona toping
          </h1>
          <p className="mt-3 text-[#6B7280] text-sm md:text-base">
            O'zbekiston bo'ylab tekshirilgan e'lonlar — tasdiqlangan egalar bilan
            xavfsiz muloqot
          </p>
          <div className="mt-6 flex justify-center">
            <SearchBar />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#16A34A]" />
              AI tekshiruv
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-[#16A34A]" />
              Tasdiqlangan egalar
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={16} className="text-[#16A34A]" />
              Xarita bo'yicha qidiruv
            </span>
          </div>
          {stats ? (
            <div className="mt-8 flex flex-wrap justify-center gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-[#111827]">
                  {stats.active_listings.toLocaleString("ru-RU")}
                </div>
                <div className="text-xs text-[#6B7280]">Faol e'lon</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">
                  {stats.verified_owners.toLocaleString("ru-RU")}
                </div>
                <div className="text-xs text-[#6B7280]">Tasdiqlangan egalar</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">
                  {stats.districts.toLocaleString("ru-RU")}
                </div>
                <div className="text-xs text-[#6B7280]">Tuman</div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Mashhur tumanlar</h2>
            <Link href="/elonlar" className="text-sm text-[#16A34A] font-medium hover:underline">
              Barchasi
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popular.map((area) => (
              <Link
                key={area.district}
                href={`/elonlar?district=${encodeURIComponent(area.district)}`}
                className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#16A34A] hover:shadow-sm transition-all"
              >
                <div className="font-semibold text-[#111827]">{area.district}</div>
                <div className="text-xs text-[#6B7280] mt-1">
                  {area.count} ta e'lon
                  {area.avg_price
                    ? ` · ${formatPrice(area.avg_price)} dan`
                    : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Search size={18} className="text-[#16A34A]" />
            Yangi e'lonlar
          </h2>
          <Link href="/elonlar" className="text-sm text-[#16A34A] font-medium hover:underline">
            Hammasini ko'rish
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {newListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        {newListings.length === 0 && (
          <div className="text-center py-10 text-[#9CA3AF]">
            Hozircha e'lonlar yo'q
          </div>
        )}
      </section>
    </div>
  );
}