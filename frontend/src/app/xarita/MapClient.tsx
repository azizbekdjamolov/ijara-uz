"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

import { api } from "@/lib/api";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import type { MapMarker } from "@/lib/types";

const TASHKENT: [number, number] = [41.3111, 69.2797];

function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number])
    );
    map.fitBounds(bounds.pad(0.15), { maxZoom: 13 });
  }, [markers, map]);
  return null;
}

export default function MapClient() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ count: number; markers: MapMarker[] }>(`/search/map/?page_size=300`)
      .then((data) => {
        if (!cancelled) setMarkers(data.markers);
      })
      .catch(() => {
        if (!cancelled) setError("Xarita ma'lumotlarini yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row">
      <div className="flex-1 relative z-0">
        <MapContainer
          center={TASHKENT}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToMarkers markers={markers} />
          {markers.map((marker) => (
            <Marker key={marker.id} position={[marker.lat, marker.lng]}>
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <div className="font-bold">{formatCompactPrice(marker.price)}</div>
                  <div className="text-foreground/70 truncate max-w-[180px]">
                    {marker.title}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {marker.district}
                    {marker.rooms ? ` В· ${marker.rooms} xona` : ""}
                  </div>
                  <Link
                    href={`/elon/${marker.slug}`}
                    className="inline-block mt-2 text-gold font-semibold hover:underline"
                  >
                    Ko'rish в†’
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#12162a]/90 backdrop-blur rounded-full px-4 py-1.5 text-sm shadow-md border border-[rgba(212,175,55,0.3)] z-[1000]">
            Yuklanmoqda...
          </div>
        )}
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#12162a] rounded-full px-4 py-1.5 text-sm text-danger shadow-md z-[1000]">
            {error}
          </div>
        )}
      </div>
      <aside className="md:w-80 lg:w-96 bg-[#0d1120]/80 backdrop-blur border-t md:border-t-0 md:border-l border-[rgba(212,175,55,0.18)] overflow-y-auto p-4 max-h-[40vh] md:max-h-none">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-gold" />
          Xaritadagi e'lonlar ({markers.length})
        </h2>
        <div className="space-y-2">
          {markers.map((marker) => (
            <Link
              key={marker.id}
              href={`/elon/${marker.slug}`}
              className="block bg-[rgba(118,118,128,0.04)] border border-[rgba(212,175,55,0.18)] rounded-lg p-3 hover:border-[rgba(212,175,55,0.6)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">
                  {formatPrice(marker.price)}
                </span>
                <span className="text-xs text-muted">{marker.district}</span>
              </div>
              <div className="text-[13px] text-foreground/70 truncate mt-0.5">
                {marker.title}
              </div>
            </Link>
          ))}
          {markers.length === 0 && !loading && (
            <div className="text-center py-6 text-muted text-sm">
              Bu hududda e'lonlar yo'q
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}