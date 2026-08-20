"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";

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
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted">
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

  const activeFilterCount = [
    query,
    district,
    propertyType,
    rooms,
    priceMax,
    furnished ? "f" : "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setQuery("");
    setDistrict("");
    setPropertyType("");
    setRooms("");
    setPriceMax("");
    setFurnished(false);
    setSort("newest");
  };

  const typeChips = (
    <div className="flex flex-wrap gap-2">
      {PROPERTY_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => setPropertyType(propertyType === t ? "" : t)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            propertyType === t
              ? "bg-primary text-white shadow-md"
              : "bg-[rgba(118,118,128,0.1)] text-foreground hover:bg-[rgba(118,118,128,0.18)]"
          }`}
        >
          {PROPERTY_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4 animate-fade-in-up">
        <h1 className="text-2xl font-bold">E&apos;lonlar</h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`lg:hidden btn ${showFilters ? "btn-primary" : "btn-secondary"} px-3.5 py-2 text-sm`}
        >
          <SlidersHorizontal size={16} />
          Filtrlar
          {activeFilterCount > 0 && (
            <span className="bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside
          className={`${
            showFilters ? "block animate-slide-in-right" : "hidden"
          } lg:block lg:w-72 shrink-0`}
        >
          <div className="card p-4 space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Filtrlash</span>
              <button
                onClick={clearFilters}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                <X size={13} /> Tozalash
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish..."
                className="input pl-10"
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Mulk turi
              </div>
              {typeChips}
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Tuman
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={`input ${district ? "text-foreground" : "text-muted"}`}
              >
                <option value="">Barchasi</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Xonalar
              </div>
              <select
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                className={`input ${rooms ? "text-foreground" : "text-muted"}`}
              >
                <option value="">Istamas</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{r} xona</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Narx, so&apos;mgacha
              </div>
              <input
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Masalan: 5000000"
                className="input"
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                Tartiblash
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={`input ${sort !== "newest" ? "text-foreground" : "text-muted"}`}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <span className={`relative inline-flex w-11 h-7 rounded-full transition-colors ${furnished ? "bg-primary" : "bg-[rgba(118,118,128,0.25)]"}`}>
                <input
                  type="checkbox"
                  checked={furnished}
                  onChange={(e) => setFurnished(e.target.checked)}
                  className="peer sr-only"
                />
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${furnished ? "translate-x-4" : ""}`} />
              </span>
              Mebelli
            </label>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted">
              {loading ? (
                <span className="animate-pulse-soft">Yuklanmoqda...</span>
              ) : (
                `${total} ta e'lon topildi`
              )}
            </div>
          </div>

          {error ? (
            <div className="text-center py-10 text-danger animate-fade-in">{error}</div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton aspect-[4/3]" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 animate-scale-in">
              <MapPin size={40} className="mx-auto text-muted mb-3" />
              <div className="text-muted">Hech narsa topilmadi.</div>
              <div className="text-sm text-muted mt-1">
                Filtrlarni o&apos;zgartirib ko&apos;ring
              </div>
              <button
                onClick={clearFilters}
                className="btn btn-secondary px-4 py-2 text-sm mt-4"
              >
                Filtrlarni tozalash
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
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