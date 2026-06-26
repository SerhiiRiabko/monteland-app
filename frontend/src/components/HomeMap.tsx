"use client";
import { useEffect, useRef } from "react";

const PLOTS = [
  { id: "1", lat: 42.430, lon: 19.259, price: 85000,  area: 500  },
  { id: "2", lat: 42.291, lon: 18.840, price: 145000, area: 800  },
  { id: "3", lat: 42.424, lon: 18.771, price: 220000, area: 1200 },
  { id: "4", lat: 42.097, lon: 19.101, price: 65000,  area: 600  },
  { id: "5", lat: 42.453, lon: 18.537, price: 190000, area: 950  },
  { id: "6", lat: 42.428, lon: 18.696, price: 310000, area: 700  },
  { id: "7", lat: 41.922, lon: 19.228, price: 42000,  area: 2000 },
  { id: "8", lat: 42.773, lon: 19.084, price: 28000,  area: 3000 },
];

const pinColor = (price: number) =>
  price >= 200000 ? "#ef4444" : price >= 100000 ? "#f97316" : price >= 50000 ? "#22c55e" : "#3b82f6";

export default function HomeMap() {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [42.7, 19.3],
        zoom: 8,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapInst.current = map;

      // Satellite base layer
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(map);

      // Labels on top
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, opacity: 0.8 }
      ).addTo(map);

      // Montenegro municipalities — from local GeoJSON (no external dependency)
      const geoData = await import("@/lib/mne_regions.json");

      L.geoJSON(geoData as unknown as GeoJSON.GeoJsonObject, {
        style: {
          color: "#ff4444",
          weight: 1.8,
          fillOpacity: 0,
        },
        onEachFeature: (feature, layer) => {
          const name: string = (feature.properties as { name?: string })?.name ?? "";
          if (!name) return;

          layer.on("add", function () {
            // place label at polygon centroid
            const bounds = (layer as L.Polygon).getBounds?.();
            if (!bounds) return;
            const center = bounds.getCenter();
            L.marker(center, {
              icon: L.divIcon({
                className: "",
                html: `<span style="
                  font-size:10px;font-weight:700;
                  color:#fff;
                  text-shadow:0 1px 3px rgba(0,0,0,1),0 0 8px rgba(0,0,0,0.8);
                  white-space:nowrap;
                  pointer-events:none;
                ">${name}</span>`,
                iconAnchor: [40, 8],
              }),
              interactive: false,
            }).addTo(map);
          });
        },
      }).addTo(map);

      // Plot pins
      PLOTS.forEach((p) => {
        const color = pinColor(p.price);
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;
            background:${color};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.5);
            cursor:pointer;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const fmt = (n: number) => `€${(n / 1000).toFixed(0)}k`;
        L.marker([p.lat, p.lon], { icon })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:150px;padding:4px">
              <div style="font-size:18px;font-weight:700;color:#10b981">${fmt(p.price)}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px">${p.area} m²</div>
              <button onclick="window.location='/map'" style="
                margin-top:10px;width:100%;padding:7px;
                background:#10b981;color:white;border:none;
                border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;
              ">Детальніше →</button>
            </div>
          `, { maxWidth: 200 })
          .addTo(map);
      });

      L.control.attribution({ prefix: "© Esri · GADM" }).addTo(map);
    };

    init();
    return () => {
      if (mapInst.current) {
        (mapInst.current as { remove: () => void }).remove();
        mapInst.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height: "100%", width: "100%" }}
      className="rounded-2xl overflow-hidden"
    />
  );
}