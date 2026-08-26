"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  type Map as MapLibreMapType,
  type Marker as MapLibreMarkerType,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle, detectTheme } from "@/lib/map-style";

export default function LocationPicker({
  lat,
  lng,
  center,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  center: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
  const markerRef = useRef<MapLibreMarkerType | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: getMapStyle(detectTheme()),
      center,
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("click", (e) => {
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:linear-gradient(180deg,#e8c869,#d4af37);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.5)";
      markerRef.current = new MapLibreMarker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => map.jumpTo({ center });
    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [center]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-[rgba(212,175,55,0.25)] h-64">
      <div ref={containerRef} className="h-full w-full cursor-crosshair" />
      {!lat && (
        <div className="absolute inset-x-0 bottom-0 bg-[#12162a]/85 backdrop-blur px-3 py-2 text-xs text-muted pointer-events-none">
          Xaritaga bosib uy joylashuvini belgilang
        </div>
      )}
    </div>
  );
}
