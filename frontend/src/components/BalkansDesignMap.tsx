"use client";
import { useEffect, useRef } from "react";

interface BalkansDesignMapProps {
  onMontenegroSelect: () => void;
}

const COUNTRIES = [
  { name: "Хорватия", color: "#3b82f6", opacity: 0.6 },
  { name: "Сербия", color: "#8b5cf6", opacity: 0.6 },
  { name: "Черногория", color: "#ff6b35", opacity: 0.8, highlight: true },
  { name: "Босния", color: "#06b6d4", opacity: 0.6 },
  { name: "Словения", color: "#10b981", opacity: 0.6 },
  { name: "Албания", color: "#f59e0b", opacity: 0.6 },
  { name: "Греция", color: "#ec4899", opacity: 0.6 },
];

export default function BalkansDesignMap({ onMontenegroSelect }: BalkansDesignMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [43.5, 18.0],
        zoom: 6.5,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapInst.current = map;

      // Satellite tiles
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, opacity: 0.8 }
      ).addTo(map);

      // Add Balkans regions overlay (simplified)
      const regions: {
        name: string;
        bounds: [[number, number], [number, number]];
        color: string;
        interactive?: boolean;
      }[] = [
        {
          name: "Хорватия",
          bounds: [[42.0, 13.5], [47.0, 20.0]],
          color: "#3b82f6",
        },
        {
          name: "Сербия",
          bounds: [[43.5, 18.0], [46.5, 23.0]],
          color: "#8b5cf6",
        },
        {
          name: "Черногория",
          bounds: [[41.85, 18.4], [42.88, 19.45]],
          color: "#ff6b35",
          interactive: true,
        },
        {
          name: "Босния",
          bounds: [[42.5, 15.7], [45.0, 19.6]],
          color: "#06b6d4",
        },
        {
          name: "Албания",
          bounds: [[39.6, 19.3], [42.65, 21.0]],
          color: "#f59e0b",
        },
        {
          name: "Греция",
          bounds: [[34.76, 20.75], [41.5, 28.6]],
          color: "#ec4899",
        },
      ];

      regions.forEach((region) => {
        const rect = L.rectangle(region.bounds, {
          color: region.color,
          weight: 2,
          fillColor: region.color,
          fillOpacity: region.interactive ? 0.7 : 0.4,
          className: region.interactive ? "cursor-pointer hover:opacity-80" : "",
        } as any);

        rect.addTo(map);

        if (region.interactive) {
          rect.on("click", () => {
            onMontenegroSelect();
          });

          // Add label for Montenegro
          const bounds = region.bounds;
          const center = [
            (bounds[0][0] + bounds[1][0]) / 2,
            (bounds[0][1] + bounds[1][1]) / 2,
          ] as [number, number];

          L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<div style="
                text-align: center;
                background: rgba(255, 107, 53, 0.9);
                padding: 12px 16px;
                border-radius: 8px;
                border: 2px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
              ">
                <div style="
                  color: white;
                  font-weight: 700;
                  font-size: 14px;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                ">🏔️ Черногория</div>
              </div>`,
              iconSize: [140, 50],
              iconAnchor: [70, 25],
              popupAnchor: [0, -25],
            }),
          })
            .addTo(map)
            .on("click", () => {
              onMontenegroSelect();
            });
        } else {
          // Add country labels
          const bounds = region.bounds;
          const center = [
            (bounds[0][0] + bounds[1][0]) / 2,
            (bounds[0][1] + bounds[1][1]) / 2,
          ] as [number, number];

          L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<span style="
                font-size: 11px;
                font-weight: 700;
                color: white;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                pointer-events: none;
                text-transform: uppercase;
              ">${region.name}</span>`,
              iconSize: [80, 20],
              iconAnchor: [40, 10],
            }),
            interactive: false,
          }).addTo(map);
        }
      });

      L.control.attribution({ prefix: "© Esri · GADM" }).addTo(map);
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
    <div ref={mapRef} style={{ height: "100%", width: "100%" }} className="rounded-none overflow-hidden" />
  );
}
