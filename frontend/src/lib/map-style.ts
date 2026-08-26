import type { StyleSpecification } from "maplibre-gl";

export type MapTheme = "dark" | "light";

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

function cartoTiles(variant: "dark_all" | "light_all"): string[] {
  return [
    `https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
    `https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
    `https://c.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
  ];
}

export function getMapStyle(theme: MapTheme = "dark"): StyleSpecification {
  const variant = theme === "dark" ? "dark_all" : "light_all";
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: cartoTiles(variant),
        tileSize: 512,
        attribution: CARTO_ATTRIBUTION,
        maxzoom: 19,
      },
    },
    layers: [{ id: "basemap-layer", type: "raster", source: "basemap" }],
  };
}

export function detectTheme(): MapTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}
