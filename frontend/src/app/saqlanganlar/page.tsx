"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ListingSummary } from "@/lib/types";
import ListingCard from "@/components/ListingCard";

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ count: number; results: ListingSummary[] }>(
        "/listings/favorites/?page_size=50"
      );
      setListings(data.results);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Xatolik");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/saqlanganlar");
      return;
    }
    load();
  }, [user, loading, router, load]);

  if (loading || (user && loadingList)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-[#9CA3AF]">
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-4">Saqlanganlar</h1>
      {error && (
        <div className="mb-4 bg-[#FFEBEA] border border-[#FFC7C5] text-danger rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}
      {listings.length === 0 ? (
        <div className="text-center py-16 text-muted animate-fade-in">
          Hozircha saqlangan e&apos;lonlar yo&apos;q.
          <Link href="/elonlar" className="block mt-2 text-primary font-semibold">
            E&apos;lonlarni ko&apos;rish
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}