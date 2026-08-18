"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { api, ApiRequestError } from "@/lib/api";
import { PROPERTY_TYPE_LABELS } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";
import ListingCard from "@/components/ListingCard";

const DISTRICTS = [
  "Bektemir", "Chilonzor", "Mirabod", "Mirzo Ulug'bek", "Olmazor",
  "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot",
  "Yashnobod", "Yunusobod",
];

const PROPERTY_TYPES = ["apartment", "house", "room", "office", "commercial"];

const SORTS = [
  { value: "newest", label: "Eng yangi" },
  { value: "price_asc", label: "Arzonlari" },
  { value: "price_desc", label: "Qimmatlari" },
];

export default function ListingsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-[#9CA3AF]">
          Yuklanmoqda...
        </div>
      }
    >
      <ListingsPage />
    </Suspense>
  );
}

function ListingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [propertyType, setPropertyType] = useState(
    searchParams.get("property_type") ?? ""
  );
  const [rooms, setRooms] = useState(searchParams.get("rooms") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("price_max") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [furnished, setFurnished] = useState(
    searchParams.get("furnished") === "true"
  );
  const [results, setResults] = useState<ListingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (district) params.set("district", district);
    if (propertyType) params.set("property_type", propertyType);
    if (rooms) params.set("rooms", rooms);
    if (priceMax) params.set("price_max", priceMax);
    if (furnished) params.set("furnished", "true");
    if (sort !== "newest") params.set("sort", sort);
    params.set("page_size", "24");
    try {
      const data = await api.get<{ count: number; results: ListingSummary[] }>(
        `/search/listings/?${params.toString()}`
      );
      setResults(data.results);
      setTotal(data.count);
    } catch (e) {
      setError(
        e instanceof ApiRequestError ? e.message : "Xatolik yuz berdi"
      );
    } finally {
      setLoading(false);
    }
  }, [query, district, propertyType, rooms, priceMax, furnished, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (district) params.set("district", district);
    if (propertyType) params.set("property_type", propertyType);
    if (rooms) params.set("rooms", rooms);
    if (priceMax) params.set("price_max", priceMax);
    if (furnished) params.set("furnished", "true");
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `/elonlar?${qs}` : "/elonlar", { scroll: false });
  }, [query, district, propertyType, rooms, priceMax, furnished, sort, router]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const inputClass =
    "w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#16A34A] bg-white";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">E'lonlar</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside
          className={`${
            showFilters ? "block" : "hidden"
          } lg:block lg:w-64 shrink-0`}
        >
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-4 sticky top-20">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish..."
              className={inputClass}
            />
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-1">
                Tuman
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={inputClass}
              >
                <option value="">Barchasi</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-1">
                Turi
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={inputClass}
              >
                <option value="">Barchasi</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-1">
                Xonalar
              </label>
              <select
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                className={inputClass}
              >
                <option value="">Istamas</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{r} xona</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-1">
                Narx, so'mgacha
              </label>
              <input
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Masalan: 5000000"
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={furnished}
                onChange={(e) => setFurnished(e.target.checked)}
                className="accent-[#16A34A]"
              />
              Mebelli
            </label>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] block mb-1">
                Tartiblash
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={inputClass}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-[#6B7280]">
              {loading ? "Yuklanmoqda..." : `${total} ta e'lon topildi`}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden flex items-center gap-1.5 text-sm font-medium text-[#16A34A]"
            >
              <SlidersHorizontal size={16} />
              Filtrlar
            </button>
          </div>
          {error ? (
            <div className="text-center py-10 text-[#DC2626]">{error}</div>
          ) : results.length === 0 && !loading ? (
            <div className="text-center py-10 text-[#9CA3AF]">
              Hech narsa topilmadi. Filtrlarni o'zgartiring.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}