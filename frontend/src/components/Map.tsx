"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/translations";

interface LandPoint {
  id: string;
  lat: number;
  lon: number;
  price_eur: number;
  area_m2: number;
  city: string;
  region: string;
  status: string;
}

const DEMO_POINTS: LandPoint[] = [
  { id: "1", lat: 42.4304, lon: 19.2594, price_eur: 85000, area_m2: 500, city: "Подгорица", region: "Podgorica", status: "active" },
  { id: "2", lat: 42.2917, lon: 18.8400, price_eur: 145000, area_m2: 800, city: "Будва", region: "Budva", status: "active" },
  { id: "3", lat: 42.4247, lon: 18.7712, price_eur: 220000, area_m2: 1200, city: "Котор", region: "Kotor", status: "active" },
  { id: "4", lat: 42.0978, lon: 19.1017, price_eur: 65000, area_m2: 600, city: "Бар", region: "Bar", status: "active" },
  { id: "5", lat: 42.4531, lon: 18.5375, price_eur: 190000, area_m2: 950, city: "Херцег-Нові", region: "Herceg Novi", status: "active" },
  { id: "6", lat: 42.4283, lon: 18.6963, price_eur: 310000, area_m2: 700, city: "Тіват", region: "Tivat", status: "active" },
  { id: "7", lat: 41.9224, lon: 19.2286, price_eur: 42000, area_m2: 2000, city: "Улцинь", region: "Ulcinj", status: "active" },
  { id: "8", lat: 42.7731, lon: 19.0847, price_eur: 28000, area_m2: 3000, city: "Нікшич", region: "Niksic", status: "active" },
  { id: "9", lat: 42.3100, lon: 18.9500, price_eur: 95000, area_m2: 650, city: "Будва", region: "Budva", status: "active" },
  { id: "10", lat: 42.4800, lon: 19.3100, price_eur: 55000, area_m2: 1500, city: "Подгорица", region: "Podgorica", status: "active" },
];

const priceColor = (price: number): string => {
  if (price >= 200000) return "#ef4444";
  if (price >= 100000) return "#f97316";
  if (price >= 50000)  return "#22c55e";
  return "#3b82f6";
};

const formatPrice = (p: number): string =>
  p >= 1000 ? `€${(p / 1000).toFixed(0)}k` : `€${p}`;

interface MapProps {
  lang: Lang;
}

export default function Map({ lang }: MapProps) {
  const [selected, setSelected] = useState<LandPoint | null>(null);
  const [filter, setFilter] = useState({ maxPrice: 999999, minArea: 0 });
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    points: LandPoint[];
    onSelect: (p: LandPoint | null) => void;
    selected: LandPoint | null;
  }> | null>(null);

  const labels = {
    uk: { price: "Ціна", area: "Площа", region: "Регіон", details: "Детальніше", filter_price: "Макс. ціна", filter_area: "Мін. площа", all: "Всі ділянки", close: "Закрити" },
    ru: { price: "Цена", area: "Площадь", region: "Регион", details: "Подробнее", filter_price: "Макс. цена", filter_area: "Мин. площадь", all: "Все участки", close: "Закрыть" },
    en: { price: "Price", area: "Area", region: "Region", details: "Details", filter_price: "Max price", filter_area: "Min area", all: "All plots", close: "Close" },
  }[lang];

  // Lazy-load Leaflet (SSR-safe)
  useEffect(() => {
    const load = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icons
      // @ts-expect-error leaflet icon type
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const { MapContainer, TileLayer, CircleMarker, Tooltip } = await import("react-leaflet");

      const InnerMap = ({ points, onSelect, selected }: {
        points: LandPoint[];
        onSelect: (p: LandPoint | null) => void;
        selected: LandPoint | null;
      }) => (
        <MapContainer
          center={[42.4, 19.2]}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          className="rounded-xl"
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={selected?.id === p.id ? 14 : 10}
              pathOptions={{
                fillColor: priceColor(p.price_eur),
                fillOpacity: 0.9,
                color: selected?.id === p.id ? "#1e293b" : "white",
                weight: selected?.id === p.id ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelect(selected?.id === p.id ? null : p) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs font-medium">
                  <div>{p.city}</div>
                  <div className="text-emerald-700 font-bold">{formatPrice(p.price_eur)}</div>
                  <div className="text-gray-500">{p.area_m2} m²</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      );

      setMapComponent(() => InnerMap);
    };
    load();
  }, []);

  const filtered = DEMO_POINTS.filter(
    (p) => p.price_eur <= filter.maxPrice && p.area_m2 >= filter.minArea
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Фільтри</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{labels.filter_price}</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                value={filter.maxPrice}
                onChange={(e) => setFilter((f) => ({ ...f, maxPrice: +e.target.value }))}
              >
                <option value={999999}>{labels.all}</option>
                <option value={50000}>€50k</option>
                <option value={100000}>€100k</option>
                <option value={200000}>€200k</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{labels.filter_area} (m²)</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                value={filter.minArea}
                onChange={(e) => setFilter((f) => ({ ...f, minArea: +e.target.value }))}
              >
                <option value={0}>{labels.all}</option>
                <option value={500}>500+</option>
                <option value={1000}>1000+</option>
                <option value={2000}>2000+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Ціна</h3>
          <div className="space-y-1.5">
            {[
              { color: "#3b82f6", label: "до €50k" },
              { color: "#22c55e", label: "€50k–100k" },
              { color: "#f97316", label: "€100k–200k" },
              { color: "#ef4444", label: "€200k+" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="text-xs text-gray-400 text-center">
          {filtered.length} ділянок на карті
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div className="h-full rounded-xl overflow-hidden border border-gray-200">
          {MapComponent ? (
            <MapComponent points={filtered} onSelect={setSelected} selected={selected} />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-gray-400 text-sm">Завантаження карти…</div>
            </div>
          )}
        </div>

        {/* Plot card popup */}
        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-72 z-[1000]">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
            <div className="text-sm font-semibold text-gray-900 mb-1">{selected.city}</div>
            <div className="text-xs text-gray-400 mb-3">{selected.region}</div>
            <div className="flex gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-400">{labels.price}</div>
                <div className="text-lg font-bold text-emerald-600">
                  €{selected.price_eur.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{labels.area}</div>
                <div className="text-lg font-bold text-gray-900">{selected.area_m2} m²</div>
              </div>
            </div>
            <button className="w-full py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors">
              {labels.details}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}