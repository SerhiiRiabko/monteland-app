"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { t, regions, langLabels, type Lang } from "@/lib/translations";

const LandMap = dynamic(() => import("@/components/LandMap"), { ssr: false });
const BalkansDesignMap = dynamic(() => import("@/components/BalkansDesignMap"), { ssr: false });
const SellModal = dynamic(() => import("@/components/SellModal"), { ssr: false });
const LoginModal = dynamic(() => import("@/components/LoginModal"), { ssr: false });
const BuyerModal = dynamic(() => import("@/components/BuyerModal"), { ssr: false });

interface PlotDetail {
  id: string;
  lat: number;
  lon: number;
  price: number;
  area: number;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const [sellOpen, setSell] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [buyerOpen, setBuyer] = useState(false);
  const [showMontenegroMap, setShowMontenegroMap] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<PlotDetail | null>(null);
  const mapRef = useRef<{ zoomToMontenegro: () => void }>(null);

  const tr = t[lang];

  const handleMontenegroSelect = () => {
    setShowMontenegroMap(true);
    setTimeout(() => {
      mapRef.current?.zoomToMontenegro();
    }, 300);
  };

  const handlePlotClick = useCallback((plot: PlotDetail) => {
    setSelectedPlot(plot);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 font-sans overflow-hidden">
      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-black/40 backdrop-blur-md border-b border-white/10">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl md:text-2xl">🏔️</span>
          <span className="text-lg md:text-xl font-bold text-white">MonteLand</span>
        </div>

        {/* Search bar — desktop only */}
        <div className="hidden md:flex flex-1 mx-8 lg:mx-12">
          <div className="relative w-full">
            <input
              type="text"
              placeholder={lang === "uk" ? "Пошук по місту, ділянці..." : lang === "ru" ? "Поиск по городу, участку..." : "Search by city, plot..."}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 focus:bg-white/15 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 p-2 rounded-md transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10">
            {(["uk", "ru", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  lang === l ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
                }`}
              >
                {langLabels[l]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBuyer(true)}
            className="px-4 py-2 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors"
          >
            {tr.btn_search}
          </button>
          <button
            onClick={() => setSell(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
          >
            {tr.btn_sell}
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {/* Compact language switcher */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-0.5 border border-white/10">
            {(["uk", "ru", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-full transition-all ${
                  lang === l ? "bg-white/25 text-white" : "text-white/50 hover:text-white/70"
                }`}
              >
                {langLabels[l]}
              </button>
            ))}
          </div>
          {/* Sell button */}
          <button
            onClick={() => setSell(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors whitespace-nowrap"
          >
            {tr.btn_sell}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-screen pt-14 md:pt-[72px]">
        {!showMontenegroMap ? (
          /* Stage 1: Balkans Design Map */
          <div className="relative w-full h-full">
            <BalkansDesignMap onMontenegroSelect={handleMontenegroSelect} />

            {/* Mobile hero overlay — bottom panel */}
            <div className="absolute bottom-0 left-0 right-0 md:hidden z-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5 pt-10">
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
                {lang === "uk" ? "Земельний ринок" : lang === "ru" ? "Рынок земли" : "Land market"}
              </p>
              <h2 className="text-white text-xl font-bold mb-3">
                {lang === "uk" ? "Земля в Чорногорії" : lang === "ru" ? "Земля в Черногории" : "Land in Montenegro"}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleMontenegroSelect}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {lang === "uk" ? "🗺 Переглянути карту" : lang === "ru" ? "🗺 Открыть карту" : "🗺 View map"}
                </button>
                <button
                  onClick={() => setBuyer(true)}
                  className="flex-1 py-2.5 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {tr.btn_search}
                </button>
              </div>
            </div>

            {/* Desktop hint */}
            <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
              <p className="text-white/50 text-sm">
                {lang === "uk" ? "Натисніть на Чорногорію щоб переглянути ділянки" : lang === "ru" ? "Нажмите на Черногорию для просмотра участков" : "Click Montenegro to explore plots"}
              </p>
            </div>
          </div>
        ) : (
          /* Stage 2: Interactive Montenegro Map with Sidebars */
          <>
            {/* Left Sidebar */}
            <div className="w-56 bg-black/40 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Stats Section */}
                <div>
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Статистика</h3>
                  <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-white">1,247</div>
                      <div className="text-xs text-white/60 mt-1">Участков доступно</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-orange-400">€1.2M</div>
                      <div className="text-xs text-white/60 mt-1">Средняя стоимость</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-blue-400">12</div>
                      <div className="text-xs text-white/60 mt-1">Активных регионов</div>
                    </div>
                  </div>
                </div>

                {/* Property Types */}
                <div>
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Тип участка</h3>
                  <div className="space-y-2">
                    {["Жилая", "Коммерческая", "Сельскохозяйственная", "Смешанная"].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:text-white/80 text-white/60 transition-colors">
                        <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Цена (€)</h3>
                  <div className="space-y-2 text-white/60 text-sm">
                    <input type="range" className="w-full accent-orange-500" />
                    <div className="flex justify-between">
                      <span>€10k</span>
                      <span>€500k</span>
                    </div>
                  </div>
                </div>

                {/* Investment Goals */}
                <div>
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Цель</h3>
                  <div className="space-y-2">
                    {["Инвестиция", "Жилье", "Развитие"].map((goal) => (
                      <label key={goal} className="flex items-center gap-2 cursor-pointer hover:text-white/80 text-white/60 transition-colors">
                        <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
                        <span className="text-sm">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Map */}
            <div className="flex-1 relative">
              <LandMap ref={mapRef} lang={lang} showMontenegroMap={showMontenegroMap} onPlotClick={handlePlotClick} />

              {/* Map Overlay Stats */}
              <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-6 text-white max-w-xs">
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-white">1,247</div>
                    <div className="text-sm text-white/60">Всього ділянок</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                    <div>
                      <div className="text-lg font-bold text-orange-400">92%</div>
                      <div className="text-xs text-white/60">Збіг</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-400">4.2k</div>
                      <div className="text-xs text-white/60">Розробляють</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">112</div>
                      <div className="text-xs text-white/60">AI Проектів</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plot Details Modal */}
              {selectedPlot && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
                  <div className="w-full max-w-md bg-black/80 border-t border-white/10 rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Детали участка</h3>
                      <button onClick={() => setSelectedPlot(null)} className="text-white/50 hover:text-white transition-colors">
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <div className="text-3xl font-bold text-orange-400">€{(selectedPlot.price / 1000).toFixed(0)}k</div>
                        <div className="text-sm text-white/60 mt-1">Цена участка</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                          <div className="text-2xl font-bold text-blue-400">{selectedPlot.area}</div>
                          <div className="text-xs text-white/60 mt-1">м²</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                          <div className="text-2xl font-bold text-green-400">€{(selectedPlot.price / selectedPlot.area).toFixed(0)}</div>
                          <div className="text-xs text-white/60 mt-1">за м²</div>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <div className="text-sm font-bold text-white mb-2">Местоположение</div>
                        <div className="text-xs text-white/60">
                          Координаты: {selectedPlot.lat.toFixed(4)}, {selectedPlot.lon.toFixed(4)}
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-sm text-blue-300">
                          ✓ Верифицированный участок<br />✓ Документы в порядке<br />✓ Готов к сделке
                        </p>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <button className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors text-sm">
                          📞 Связаться с продавцом
                        </button>
                        <button onClick={() => setSelectedPlot(null)} className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm">
                          Закрыть
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Featured Opportunities */}
              <div className="absolute bottom-6 left-6 right-6 max-w-2xl">
                <h3 className="text-white font-bold mb-3 text-sm">Топові можливості</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: "Люкс Марина", location: "Котор", match: "92%", roi: "16%" },
                    { title: "Технопарк", location: "Подгориця", match: "85%", roi: "14%" },
                    { title: "Сільський курорт", location: "Герцег-Нові", match: "95%", roi: "18%" },
                  ].map((opp, idx) => (
                    <div key={idx} className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-orange-500/50 transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{opp.title}</h4>
                          <p className="text-xs text-white/60">{opp.location}</p>
                        </div>
                        <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">✓ {opp.match}</span>
                      </div>
                      <div className="text-xs text-white/50">ROI: {opp.roi}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar - AI Assistant */}
            <div className="w-80 bg-black/40 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="text-sm font-bold text-white">AI Асистент</h3>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-white/70 text-sm space-y-3">
                  <p>Привіт! 👋 Я можу допомогти вам:</p>
                  <ul className="space-y-2 text-xs">
                    <li>📊 Проаналізувати ділянки</li>
                    <li>💼 Порекомендувати інвестиції</li>
                    <li>⚖️ Відповісти на юридичні питання</li>
                    <li>🏗️ Оцінити потенціал розвитку</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">💡 <span className="font-semibold">Поради:</span> Клацніть на регіон щоб побачити детальну карту ділянок</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase">Популярні запити</h4>
                  <div className="space-y-1">
                    {["Скільки коштують ділянки в Котор?", "Кращі регіони для інвестицій", "Як купити ділянку?"].map((q, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left text-xs p-2 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-transparent hover:border-white/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {sellOpen && <SellModal lang={lang} onClose={() => setSell(false)} />}
      {buyerOpen && <BuyerModal lang={lang} onClose={() => setBuyer(false)} />}
      {loginOpen && <LoginModal lang={lang} onClose={() => setLoginOpen(false)} onSwitchToSell={() => { setLoginOpen(false); setSell(true); }} />}
    </div>
  );
}
