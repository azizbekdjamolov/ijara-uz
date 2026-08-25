"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  NavigationControl,
  LngLatBounds,
  type Map as MapLibreMapType,
  type Marker as MapLibreMarkerType,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, LocateFixed } from "lucide-react";

import { api } from "@/lib/api";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import type { MapMarker } from "@/lib/types";

const TASHKENT: [number, number] = [69.2797, 41.3111];

const OSM_STYLE: import("maplibre-gl").StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm",
    },
  ],
};

function buildPin(price: number): HTMLElement {
  const el = document.createElement("button");
  el.className =
    "maplibregl-marker-btn flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent p-0";
  el.innerHTML = `
    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
          style="background:linear-gradient(180deg,#e8c869,#d4af37);color:#1a1405;box-shadow:0 4px 14px rgba(212,175,55,0.45);border:1px solid rgba(26,20,5,0.35)">
      ${price.toLocaleString("ru-RU")}
    </span>
    <span style="display:block;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #b3902a;margin-top:-1px"></span>
  `;
  return el;
}

function buildPopupContent(marker: MapMarker): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "map-popup-content";
  div.innerHTML = `
    <div style="font-weight:700;font-size:15px;color:#f4f4f6;">${formatCompactPrice(marker.price)}</div>
    <div style="color:rgba(244,244,246,0.7);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;margin-top:2px;">${marker.title}</div>
    <div style="color:rgba(244,244,246,0.5);font-size:11px;margin-top:3px;">${marker.district}${marker.rooms ? ` · ${marker.rooms} xona` : ""}</div>
    <a href="/elon/${marker.slug}" style="display:inline-block;margin-top:8px;font-weight:600;font-size:13px;color:#d4af37;text-decoration:none;">Ko'rish →</a>
  `;
  return div;
}

export default function MapClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
  const markersRef = useRef<MapLibreMarkerType[]>([]);
  const userMarkerRef = useRef<MapLibreMarkerType | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const locateMe = () => {
    const map = mapRef.current;
    if (!map || locating) return;

    if (!("geolocation" in navigator)) {
      setGeoError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi");
      setTimeout(() => setGeoError(null), 5000);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const m = mapRef.current;
        if (!m) return;
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "user-location-dot";
          el.innerHTML = '<span class="user-location-pulse"></span>';
          userMarkerRef.current = new MapLibreMarker({ element: el })
            .setLngLat(coords)
            .addTo(m);
        } else {
          userMarkerRef.current.setLngLat(coords);
        }
        m.flyTo({ center: coords, zoom: 15, duration: 1200 });
        setGeoError(null);
      },
      (err) => {
        setLocating(false);
        const text =
          err.code === err.PERMISSION_DENIED
            ? "Joylashuv uchun ruxsat berilmadi — brauzer sozlamasidan ruxsat bering"
            : err.code === err.POSITION_UNAVAILABLE
              ? "Joylashuv hozir aniqlanmadi — internet/GPS ni tekshiring"
              : "Joylashuvni kutish vaqti tugadi — yana bosing";
        setGeoError(text);
        setTimeout(() => setGeoError(null), 6000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ count: number; markers: MapMarker[] }>(`/search/map/?page_size=300`)
      .then((data) => {
        if (!cancelled) setMarkers(data.markers);
      })
      .catch(() => {
        if (!cancelled) setApiError("E'lonlarni yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: OSM_STYLE,
      center: TASHKENT,
      zoom: 12,
      minZoom: 3,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.addControl(
      new NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("error", (e) => {
      console.warn("Map error:", e.error?.message);
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;

    markersRef.current.forEach((p) => p.remove());
    markersRef.current = [];

    const fit = () => {
      const bounds = new LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14,
        duration: 900,
      });
    };

    if (map.loaded()) {
      fit();
    } else {
      map.once("load", fit);
    }

    const pins: MapLibreMarkerType[] = [];
    markers.forEach((marker) => {
      const el = buildPin(marker.price);
      const popup = new MapLibrePopup({
        offset: 10,
        closeButton: false,
        maxWidth: "240px",
        className: "map-popup",
      }).setDOMContent(buildPopupContent(marker));

      const pin = new MapLibreMarker({ element: el, anchor: "bottom" })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);
      pins.push(pin);
    });
    markersRef.current = pins;

    return () => {
      pins.forEach((p) => p.remove());
    };
  }, [markers]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 relative z-0 min-h-[50vh] md:min-h-0">
        <div ref={containerRef} className="h-full w-full map-dark-filter" />

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="bg-[#12162a]/90 backdrop-blur-xl rounded-2xl px-6 py-4 text-sm shadow-md border border-[rgba(212,175,55,0.3)] flex flex-col items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse"></span>
              <span className="text-muted">Xarita yuklanmoqda...</span>
            </div>
          </div>
        )}

        {apiError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#12162a]/95 backdrop-blur-xl rounded-full px-5 py-2 text-sm text-[#ff6b5e] shadow-md border border-[rgba(255,107,94,0.3)] z-[1000]">
            {apiError}
          </div>
        )}

        {geoError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#12162a]/95 backdrop-blur-xl rounded-xl px-4 py-2 text-xs text-[#ff6b5e] shadow-md border border-[rgba(255,107,94,0.3)] z-[1001] max-w-[90%] text-center">
            {geoError}
          </div>
        )}

        <button
          onClick={locateMe}
          title="Men turgan joyni ko'rsat"
          className="absolute right-3 bottom-[84px] z-[1001] w-9 h-9 rounded-xl bg-[#12162a] border border-[rgba(212,175,55,0.35)] shadow-md flex items-center justify-center hover:bg-[rgba(212,175,55,0.12)] active:scale-95 transition-all cursor-pointer"
        >
          <LocateFixed
            size={16}
            className={`text-[#d4af37] ${locating ? "animate-pulse" : ""}`}
          />
        </button>

        {!loading && markers.length > 0 && (
          <div className="absolute top-3 left-3 bg-[#12162a]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 text-xs text-muted border border-[rgba(212,175,55,0.2)] z-[1000]">
            <MapPin size={12} className="inline mr-1 text-[#d4af37]" />
            {markers.length} ta e'lon
          </div>
        )}
      </div>

      <aside className="md:w-80 lg:w-96 bg-[#0d1120]/90 backdrop-blur-xl border-t md:border-t-0 md:border-l border-[rgba(212,175,55,0.18)] overflow-y-auto flex-shrink-0">
        <div className="sticky top-0 z-10 bg-[#0d1120]/95 backdrop-blur-xl border-b border-[rgba(212,175,55,0.12)] px-4 py-3">
          <h2 className="font-bold flex items-center gap-2 text-sm">
            <MapPin size={15} className="text-[#d4af37]" />
            Xaritadagi e&apos;lonlar
            <span className="ml-auto text-[11px] font-normal text-muted bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-full">
              {markers.length}
            </span>
          </h2>
        </div>

        <div className="p-3 space-y-2">
          {markers.map((marker) => (
            <Link
              key={marker.id}
              href={`/elon/${marker.slug}`}
              className="block border border-[rgba(212,175,55,0.12)] rounded-xl p-3 hover:border-[rgba(212,175,55,0.5)] hover:bg-[rgba(212,175,55,0.04)] transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm bg-gradient-to-r from-[#f2d98d] to-[#d4af37] bg-clip-text text-transparent">
                  {formatPrice(marker.price)}
                </span>
                <span className="text-[11px] text-muted">{marker.district}</span>
              </div>
              <div className="text-[13px] text-foreground/70 truncate">
                {marker.title}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted/60">
                {marker.rooms && <span>{marker.rooms} xona</span>}
                {marker.area && <span>{marker.area} m²</span>}
              </div>
            </Link>
          ))}

          {markers.length === 0 && !loading && (
            <div className="text-center py-10 text-muted text-sm">
              <MapPin size={32} className="mx-auto mb-2 text-muted/30" />
              Bu hududda e&apos;lonlar yo&apos;q
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}