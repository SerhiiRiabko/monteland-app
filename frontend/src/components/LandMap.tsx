"use client";
import { useEffect, useRef, forwardRef } from "react";
import type { Lang } from "@/lib/translations";

interface LandMapRef {
  zoomToMontenegro: () => void;
}

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

const montenegroBounds: [[number, number], [number, number]] = [[41.85, 18.40], [42.88, 19.45]];

const LandMapComponent = forwardRef<LandMapRef, { lang: Lang; showMontenegroMap: boolean; onPlotClick?: (plot: any) => void }>(
  function LandMap({ showMontenegroMap, onPlotClick }, ref) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInst = useRef<any>(null);

    useEffect(() => {
      if (!mapRef.current || mapInst.current) return;

      const init = async () => {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        const initialZoom = showMontenegroMap ? 9 : 5;
        const initialCenter = showMontenegroMap ? [42.71, 19.37] : [44.5, 18.0];

        const map = L.map(mapRef.current!, {
          center: initialCenter as [number, number],
          zoom: initialZoom,
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
          { maxZoom: 18, opacity: 0.8 }
        ).addTo(map);

        const geoData = await import("@/lib/mne_regions.json");

        L.geoJSON(geoData as unknown as GeoJSON.GeoJsonObject, {
          style: {
            color: "#ff6b35",
            weight: 2,
            fillOpacity: 0,
          },
          onEachFeature: (feature, layer) => {
            const name: string = (feature.properties as { name?: string })?.name ?? "";
            if (!name) return;

            layer.on("click", () => {
              const bounds = (layer as L.Polygon).getBounds?.();
              if (bounds) {
                map.fitBounds(bounds.pad(0.1), { animate: true, duration: 0.5 });
              }
            });

            layer.on("add", function () {
              const bounds = (layer as L.Polygon).getBounds?.();
              if (!bounds) return;
              const center = bounds.getCenter();
              L.marker(center, {
                icon: L.divIcon({
                  className: "",
                  html: `<span style="
                    font-size:11px;font-weight:700;
                    color:#fff;
                    text-shadow:0 1px 3px rgba(0,0,0,1),0 0 8px rgba(0,0,0,0.8);
                    white-space:nowrap;
                    pointer-events:none;
                    text-transform:uppercase;
                    letter-spacing:0.5px;
                  ">${name}</span>`,
                  iconAnchor: [40, 8],
                }),
                interactive: false,
              }).addTo(map);
            });
          },
        }).addTo(map);

        PLOTS.forEach((p) => {
          const color = pinColor(p.price);
          const icon = L.divIcon({
            className: "",
            html: `<div style="
              width:16px;height:16px;
              background:${color};
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 0 20px ${color},0 2px 8px rgba(0,0,0,0.6);
              cursor:pointer;
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <style>
              @keyframes pulse {
                0%, 100% { box-shadow: 0 0 20px ${color}, 0 2px 8px rgba(0,0,0,0.6); }
                50% { box-shadow: 0 0 30px ${color}, 0 2px 12px rgba(0,0,0,0.8); }
              }
            </style>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const marker = L.marker([p.lat, p.lon], { icon }).addTo(map);

          marker.on("click", () => {
            if (onPlotClick) {
              onPlotClick(p);
            }
          });
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
    }, [showMontenegroMap]);

    useEffect(() => {
      if (typeof ref === "function") {
        ref({
          zoomToMontenegro: () => {
            if (mapInst.current) {
              const L = require("leaflet");
              const latLngBounds = L.latLngBounds(montenegroBounds);
              mapInst.current.fitBounds(latLngBounds.pad(0.1), {
                animate: true,
                duration: 0.8,
              });
            }
          },
        });
      } else if (ref && "current" in ref) {
        ref.current = {
          zoomToMontenegro: () => {
            if (mapInst.current) {
              const L = require("leaflet");
              const latLngBounds = L.latLngBounds(montenegroBounds);
              mapInst.current.fitBounds(latLngBounds.pad(0.1), {
                animate: true,
                duration: 0.8,
              });
            }
          },
        };
      }
    }, [ref]);

    return (
      <div
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        className="rounded-none overflow-hidden"
      />
    );
  }
);

export default LandMapComponent;
