"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] flex items-center justify-center text-[#9CA3AF]">
      Xarita yuklanmoqda...
    </div>
  ),
});

export default function MapPage() {
  return <MapClient />;
}