"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#07090f]">
      <div className="flex flex-col items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse"></span>
        <span className="text-sm text-[rgba(244,244,246,0.55)]">Xarita yuklanmoqda...</span>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapClient />;
}