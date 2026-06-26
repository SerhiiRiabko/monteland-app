"use client";
import { useEffect, useRef } from "react";

interface BalkansDesignMapProps {
  onMontenegroSelect: () => void;
}

const COUNTRIES = [
  { name: "Хорватія",   iso: "HRV", color: "#3b82f6", interactive: false },
  { name: "Сербія",     iso: "SRB", color: "#8b5cf6", interactive: false },
  { name: "Босния",     iso: "BIH", color: "#06b6d4", interactive: false },
  { name: "Словенія",   iso: "SVN", color: "#10b981", interactive: false },
  { name: "Албанія",    iso: "ALB", color: "#f59e0b", interactive: false },
  { name: "Греція",     iso: "GRC", color: "#ec4899", interactive: false },
  { name: "Чорногорія", iso: "MNE", color: "#ff6b35", interactive: true  },
] as const;

const GEO_BASE = "/geo";

export default function BalkansDesignMap({ onMontenegroSelect }: BalkansDesignMapProps) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [42.5, 20.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapInst.current = map;

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, opacity: 0.7 }
      ).addTo(map);

      // Fetch all country GeoJSON in parallel
      const results = await Promise.allSettled(
        COUNTRIES.map(async (c) => {
          const res = await fetch(`${GEO_BASE}/${c.iso}.geo.json`);
          if (!res.ok) throw new Error(`${c.iso} failed`);
          return { country: c, geo: await res.json() };
        })
      );

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { country, geo } = result.value;

        const layer = L.geoJSON(geo, {
          style: {
            color: country.color,
            weight: 2,
            fillColor: country.color,
            fillOpacity: country.interactive ? 0.65 : 0.35,
          },
          ...(country.interactive ? { className: "cursor-pointer" } : {}),
        } as any);

        layer.addTo(map);

        // Calculate visual center for label
        const bounds = layer.getBounds();
        const center = bounds.getCenter();

        if (country.interactive) {
          layer.on("click", onMontenegroSelect);
        } else {
          L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<span style="
                font-size:11px;
                font-weight:700;
                color:white;
                text-shadow:0 1px 3px rgba(0,0,0,0.9);
                pointer-events:none;
                text-transform:uppercase;
                white-space:nowrap;
              ">${country.name}</span>`,
              iconSize: [100, 20],
              iconAnchor: [50, 10],
            }),
            interactive: false,
          }).addTo(map);
        }
      }

      L.control.attribution({ prefix: "© Esri · GitHub/johan" }).addTo(map);
    };

    init();

    return () => {
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, [onMontenegroSelect]);

  return (
    <div ref={mapRef} style={{ height: "100%", width: "100%" }} className="overflow-hidden" />
  );
}
