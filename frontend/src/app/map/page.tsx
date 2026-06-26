"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { langLabels, type Lang } from "@/lib/translations";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  const [lang, setLang] = useState<Lang>("ru");

  const ui = {
    uk: { title: "Карта ділянок", subtitle: "Натисніть на точку щоб побачити деталі" },
    ru: { title: "Карта участков", subtitle: "Нажмите на точку чтобы увидеть детали" },
    en: { title: "Land plots map", subtitle: "Click a pin to see details" },
  }[lang];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">🏔️</span>
            <span className="text-lg font-bold text-white">MonteLand</span>
          </a>
          <span className="text-white/20">|</span>
          <div>
            <div className="text-sm font-semibold text-white">{ui.title}</div>
            <div className="text-xs text-white/50">{ui.subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lang switcher */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10">
            {(["uk", "ru", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                  lang === l ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
                }`}
              >
                {langLabels[l]}
              </button>
            ))}
          </div>

          <a
            href="/"
            className="px-4 py-1.5 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors"
          >
            ← На главную
          </a>
        </div>
      </header>

      {/* Map fills remaining space */}
      <main className="flex-1 p-4 min-h-0">
        <Map lang={lang} />
      </main>
    </div>
  );
}