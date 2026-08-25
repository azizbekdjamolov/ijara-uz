import { API_URL, type ListingSummary, type PlatformStats, type PopularArea } from "@/lib/types";
import HomePageClient from "./HomePageClient";

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

  return <HomePageClient newListings={newListings} popular={popular} stats={stats} />;
}
