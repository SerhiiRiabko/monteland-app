"use client";
import { useState } from "react";
import type { Lang } from "@/lib/translations";

interface Props {
  lang: Lang;
  onClose: () => void;
}

const ui = {
  uk: {
    title: "Продати ділянку",
    subtitle: "Залиште контакт — ми зв'яжемось протягом дня",
    name_label: "Ім'я",
    name_ph: "Як вас звати?",
    phone_label: "Телефон",
    phone_ph: "+382 6X XXX XXX",
    location_label: "Де знаходиться ділянка?",
    location_ph: "Напр.: Будва, Режевичи",
    area_label: "Площа, м² (якщо знаєте)",
    area_ph: "Необов'язково",
    btn_whatsapp: "Написати у WhatsApp",
    btn_callback: "Замовити дзвінок",
    no_registration: "Жодних паролів і реєстрації — наш менеджер оформить оголошення за вас",
    required: "Обов'язкове поле",
    invalid_phone: "Введіть коректний номер",
    error_network: "Помилка з'єднання. Спробуйте ще раз.",
    success_wa: "Відкриваємо WhatsApp...",
    success_callback: "Заявку прийнято! Передзвонимо вам найближчим часом.",
    close: "Закрити",
  },
  ru: {
    title: "Продать участок",
    subtitle: "Оставьте контакт — мы свяжемся в течение дня",
    name_label: "Имя",
    name_ph: "Как вас зовут?",
    phone_label: "Телефон",
    phone_ph: "+382 6X XXX XXX",
    location_label: "Где находится участок?",
    location_ph: "Напр.: Будва, Режевичи",
    area_label: "Площадь, м² (если знаете)",
    area_ph: "Необязательно",
    btn_whatsapp: "Написать в WhatsApp",
    btn_callback: "Заказать звонок",
    no_registration: "Никаких паролей и регистрации — наш менеджер оформит объявление за вас",
    required: "Обязательное поле",
    invalid_phone: "Введите корректный номер",
    error_network: "Ошибка соединения. Попробуйте ещё раз.",
    success_wa: "Открываем WhatsApp...",
    success_callback: "Заявка принята! Мы перезвоним вам в ближайшее время.",
    close: "Закрыть",
  },
  en: {
    title: "Sell a plot",
    subtitle: "Leave your contact — we'll get in touch within the day",
    name_label: "Name",
    name_ph: "What's your name?",
    phone_label: "Phone",
    phone_ph: "+382 6X XXX XXX",
    location_label: "Where is the plot?",
    location_ph: "e.g. Budva, Rezhevichi",
    area_label: "Area, m² (if you know)",
    area_ph: "Optional",
    btn_whatsapp: "Write on WhatsApp",
    btn_callback: "Request a call",
    no_registration: "No passwords or registration — our manager will handle the listing for you",
    required: "Required field",
    invalid_phone: "Enter a valid phone number",
    error_network: "Connection error. Please try again.",
    success_wa: "Opening WhatsApp...",
    success_callback: "Request received! We'll call you shortly.",
    close: "Close",
  },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// Placeholder — set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

type DoneType = "whatsapp" | "callback" | null;

export default function SellModal({ lang, onClose }: Props) {
  const l = ui[lang];

  const [form, setForm] = useState({ name: "", phone: "", location: "", area: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<"wa" | "cb" | null>(null);
  const [done, setDone] = useState<DoneType>(null);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; delete n.global; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())     e.name     = l.required;
    if (!form.phone.trim() || form.phone.trim().length < 7) e.phone = l.invalid_phone;
    if (!form.location.trim()) e.location = l.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitLead = async (source: "whatsapp" | "callback") => {
    if (!validate()) return;
    setLoading(source === "whatsapp" ? "wa" : "cb");
    try {
      const res = await fetch(`${API}/api/v1/lands/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          location: form.location.trim(),
          area_m2: form.area ? parseInt(form.area) : null,
          source,
        }),
      });

      if (!res.ok) { setErrors({ global: l.error_network }); return; }
      const data = await res.json();

      if (source === "whatsapp") {
        // Open WhatsApp: use URL from backend (has real WA number) or build client-side
        const waUrl = data.whatsapp_url ?? buildWaUrl();
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }

      setDone(source);
    } catch {
      setErrors({ global: l.error_network });
    } finally {
      setLoading(null);
    }
  };

  const buildWaUrl = () => {
    const msg = encodeURIComponent(
      `Здравствуйте! Хочу разместить участок.\nИмя: ${form.name}\nТелефон: ${form.phone}\nРасположение: ${form.location}${form.area ? `\nПлощадь: ${form.area} м²` : ""}`
    );
    return WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {done ? (
          /* Success screen */
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">{done === "whatsapp" ? "💬" : "📞"}</div>
            <p className="text-gray-700 font-medium mb-6">
              {done === "whatsapp" ? l.success_wa : l.success_callback}
            </p>
            <button onClick={onClose}
              className="px-8 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors">
              {l.close}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{l.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{l.subtitle}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">×</button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {errors.global && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {errors.global}
                </div>
              )}

              <Field label={l.name_label} error={errors.name}>
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder={l.name_ph} className={inp(errors.name)} />
              </Field>

              <Field label={l.phone_label} error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  placeholder={l.phone_ph} className={inp(errors.phone)} />
              </Field>

              <Field label={l.location_label} error={errors.location}>
                <input value={form.location} onChange={(e) => set("location", e.target.value)}
                  placeholder={l.location_ph} className={inp(errors.location)} />
              </Field>

              <Field label={l.area_label}>
                <input type="number" value={form.area} onChange={(e) => set("area", e.target.value)}
                  placeholder={l.area_ph} className={inp()} />
              </Field>
            </div>

            {/* CTA Buttons */}
            <div className="px-6 pb-5 space-y-3">
              <button
                onClick={() => submitLead("whatsapp")}
                disabled={loading !== null}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#25D366] rounded-xl hover:bg-[#1ebe5d] disabled:opacity-60 transition-colors"
              >
                {loading === "wa" ? (
                  <span>…</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {l.btn_whatsapp}
                  </>
                )}
              </button>

              <button
                onClick={() => submitLead("callback")}
                disabled={loading !== null}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {loading === "cb" ? (
                  <span>…</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                    </svg>
                    {l.btn_callback}
                  </>
                )}
              </button>

              {/* Trust note */}
              <p className="text-center text-xs text-gray-400 pt-1 flex items-center justify-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {l.no_registration}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inp(err?: string) {
  return `w-full text-sm border ${err ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-emerald-400"} rounded-xl px-3 py-2.5 focus:outline-none transition-colors bg-white`;
}
