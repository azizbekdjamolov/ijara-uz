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
import { MapPin } from "lucide-react";

import { api } from "@/lib/api";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import type { MapMarker } from "@/lib/types";

const TASHKENT: [number, number] = [41.3111, 69.2797];

function buildPin(price: number): HTMLElement {
  const el = document.createElement("button");
  el.className =
    "flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent p-0 -translate-y-1/2";
  el.innerHTML = `
    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold text-[#1a1405] whitespace-nowrap shadow-[0_4px_14px_rgba(212,175,55,0.45)]"
          style="background:linear-gradient(180deg,#e8c869,#d4af37);border:1px solid rgba(26,20,5,0.35)">
      ${price.toLocaleString("ru-RU")}
    </span>
    <span style="display:block;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #b3902a"></span>
  `;
  return el;
}

export default function MapClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: "https://tiles.openfreemap.org/styles/freedom",
      center: TASHKENT,
      zoom: 12,
      pitch: 62,
      bearing: -20,
      maxPitch: 85,
      minZoom: 3,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("load", () => {
      try {
        map.addSource("terrain", {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          encoding: "terrarium",
          tileSize: 256,
          maxzoom: 15,
        });
        map.setTerrain({ source: "terrain", exaggeration: 1.6 });
      } catch {
        // terrain opsiyasidan voz kechamiz
      }

      try {
        const style = map.getStyle();
        const buildingLayer = style?.layers?.find(
          (l) => l.id === "building"
        );
        map.addLayer(
          {
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "rgba(212,175,55,0.32)",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.8,
                ["get", "render_height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.8,
                ["get", "render_min_height"],
              ],
              "fill-extrusion-opacity": 0.75,
            },
          },
          buildingLayer ? buildingLayer.id : undefined
        );
      } catch {
        // binolar qatlami ixtiyoriy
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

const fit = () => {
      if (markers.length === 0) return;
      const bounds = new LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14.5,
        pitch: 62,
        bearing: -20,
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
        offset: 8,
        closeButton: false,
        maxWidth: "240px",
        className: "map-popup",
      }).setDOMContent(
        (() => {
          const div = document.createElement("div");
          div.className = "text-sm";
          div.innerHTML = `
            <div class="font-bold">${formatCompactPrice(marker.price)}</div>
            <div class="opacity-70 truncate max-w-[180px]">${marker.title}</div>
            <div class="text-xs opacity-50 mt-0.5">${marker.district}${
            marker.rooms ? ` В· ${marker.rooms} xona` : ""
          }</div>
            <a href="/elon/${marker.slug}" class="inline-block mt-2 font-semibold" style="color:var(--gold)">Ko'rish в†’</a>
          `;
          return div;
        })()
      );
      const pin = new MapLibreMarker({ element: el, anchor: "bottom" })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);
      pins.push(pin);
    });

    return () => {
      pins.forEach((p) => p.remove());
    };
  }, [markers]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row">
      <div className="flex-1 relative z-0">
        <div ref={containerRef} className="h-full w-full" />
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
          Xaritadagi e&apos;lonlar ({markers.length})
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
              Bu hududda e&apos;lonlar yo&apos;q
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}