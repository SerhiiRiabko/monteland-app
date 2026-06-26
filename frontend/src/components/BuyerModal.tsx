"use client";
import { useState } from "react";
import type { Lang } from "@/lib/translations";

interface Props {
  lang: Lang;
  onClose: () => void;
}

type MessengerChannel = "whatsapp" | "viber" | "telegram";
type Step = 1 | 2 | 3;

const MESSENGERS: { id: MessengerChannel; label: string; color: string; activeColor: string; icon: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "border-gray-200 hover:border-green-400 hover:bg-green-50",  activeColor: "border-green-500 bg-green-50",   icon: "📱" },
  { id: "viber",    label: "Viber",    color: "border-gray-200 hover:border-purple-400 hover:bg-purple-50", activeColor: "border-purple-500 bg-purple-50", icon: "💜" },
  { id: "telegram", label: "Telegram", color: "border-gray-200 hover:border-sky-400 hover:bg-sky-50",       activeColor: "border-sky-500 bg-sky-50",       icon: "✈️" },
];

const REGIONS = [
  "Andrijevica","Bar","Berane","Bijelo Polje","Budva","Cetinje",
  "Danilovgrad","Herceg Novi","Kolašin","Kotor","Mojkovac",
  "Nikšić","Plav","Pljevlja","Plužine","Podgorica",
  "Rožaje","Šavnik","Tivat","Ulcinj","Žabljak",
];

const ui = {
  uk: {
    title: "Шукати ділянку",
    subtitle: "Вкажіть параметри — ми надішлемо підходящі варіанти у ваш месенджер",
    step1: "Параметри",
    step2: "Контакт",
    step3: "Підтвердження",
    region_label: "Регіон (необов'язково)",
    region_ph: "Будь-який регіон",
    price_min_label: "Ціна від (€)",
    price_max_label: "Ціна до (€)",
    price_ph: "напр. 50000",
    area_min_label: "Площа від (m²)",
    area_max_label: "Площа до (m²)",
    area_ph: "напр. 500",
    name_label: "Ваше ім'я",
    name_ph: "Ім'я та прізвище",
    messenger_label: "Куди надсилати підбірки?",
    messenger_hint: "Ви будете отримувати нові ділянки одразу як вони з'являться",
    phone_label: "Номер телефону",
    phone_ph: "+382 12 345 678",
    otp_hint: "Введіть код з",
    otp_label: "Код підтвердження",
    otp_ph: "6 цифр",
    btn_send_code: "Надіслати код",
    btn_confirm: "Підписатись на сповіщення",
    btn_resend: "Надіслати ще раз",
    change_number: "Змінити номер",
    next: "Далі →",
    back: "← Назад",
    cancel: "Скасувати",
    required: "Обов'язкове поле",
    choose_messenger: "Оберіть месенджер",
    invalid_phone: "Введіть коректний номер",
    invalid_otp: "Код має містити 6 цифр",
    error_otp: "Невірний код",
    error_otp_expired: "Код застарів — надішліть новий",
    error_network: "Помилка з'єднання",
    success_title: "Підписку оформлено!",
    success_msg: "Ви отримаєте повідомлення як тільки з'являться відповідні ділянки.",
    success_matched: "Вже зараз є {n} ділянок, що підходять!",
    success_close: "Закрити",
    no_limit: "Без обмежень",
    open_telegram_bot: "Відкрити Telegram бот",
    telegram_hint: "Бот надішле вам код — введіть його нижче",
  },
  ru: {
    title: "Найти участок",
    subtitle: "Укажите параметры — мы будем присылать подходящие варианты в ваш мессенджер",
    step1: "Параметры",
    step2: "Контакт",
    step3: "Подтверждение",
    region_label: "Регион (необязательно)",
    region_ph: "Любой регион",
    price_min_label: "Цена от (€)",
    price_max_label: "Цена до (€)",
    price_ph: "напр. 50000",
    area_min_label: "Площадь от (m²)",
    area_max_label: "Площадь до (m²)",
    area_ph: "напр. 500",
    name_label: "Ваше имя",
    name_ph: "Имя и фамилия",
    messenger_label: "Куда отправлять подборки?",
    messenger_hint: "Вы будете получать новые участки сразу как они появятся",
    phone_label: "Номер телефона",
    phone_ph: "+382 12 345 678",
    otp_hint: "Введите код из",
    otp_label: "Код подтверждения",
    otp_ph: "6 цифр",
    btn_send_code: "Отправить код",
    btn_confirm: "Подписаться на уведомления",
    btn_resend: "Отправить ещё раз",
    change_number: "Изменить номер",
    next: "Далее →",
    back: "← Назад",
    cancel: "Отмена",
    required: "Обязательное поле",
    choose_messenger: "Выберите мессенджер",
    invalid_phone: "Введите корректный номер",
    invalid_otp: "Код должен содержать 6 цифр",
    error_otp: "Неверный код",
    error_otp_expired: "Код устарел — запросите новый",
    error_network: "Ошибка соединения",
    success_title: "Подписка оформлена!",
    success_msg: "Вы получите сообщение как только появятся подходящие участки.",
    success_matched: "Уже сейчас есть {n} подходящих участков!",
    success_close: "Закрыть",
    no_limit: "Без ограничений",
    open_telegram_bot: "Открыть Telegram бот",
    telegram_hint: "Бот пришлёт вам код — введите его ниже",
  },
  en: {
    title: "Find a plot",
    subtitle: "Set your criteria — we'll send matching listings straight to your messenger",
    step1: "Criteria",
    step2: "Contact",
    step3: "Verify",
    region_label: "Region (optional)",
    region_ph: "Any region",
    price_min_label: "Price from (€)",
    price_max_label: "Price to (€)",
    price_ph: "e.g. 50000",
    area_min_label: "Area from (m²)",
    area_max_label: "Area to (m²)",
    area_ph: "e.g. 500",
    name_label: "Your name",
    name_ph: "Full name",
    messenger_label: "Where to send listings?",
    messenger_hint: "You'll get new matching plots as soon as they appear",
    phone_label: "Phone number",
    phone_ph: "+382 12 345 678",
    otp_hint: "Enter the code from",
    otp_label: "Verification code",
    otp_ph: "6 digits",
    btn_send_code: "Send code",
    btn_confirm: "Subscribe to alerts",
    btn_resend: "Send again",
    change_number: "Change number",
    next: "Next →",
    back: "← Back",
    cancel: "Cancel",
    required: "Required field",
    choose_messenger: "Choose a messenger",
    invalid_phone: "Enter a valid phone number",
    invalid_otp: "Code must be 6 digits",
    error_otp: "Invalid code",
    error_otp_expired: "Code expired — request a new one",
    error_network: "Connection error",
    success_title: "Subscribed!",
    success_msg: "You'll get a message as soon as matching plots appear.",
    success_matched: "{n} matching plots available right now!",
    success_close: "Close",
    no_limit: "No limit",
    open_telegram_bot: "Open Telegram bot",
    telegram_hint: "The bot will send you a code — enter it below",
  },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BuyerModal({ lang, onClose }: Props) {
  const l = ui[lang];

  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Step 1: search criteria
  const [form, setForm] = useState({
    region: "", price_min: "", price_max: "", area_min: "", area_max: "",
  });

  // Step 2: contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<MessengerChannel | null>(null);

  // Step 3: OTP
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const clearErr = (k: string) => setErrors((e) => { const n = { ...e }; delete n[k]; return n; });

  // ── Step 2 → send OTP ──────────────────────────────────────────────────────
  const goToOtp = async () => {
    const e: Record<string, string> = {};
    if (!name.trim())              e.name    = l.required;
    if (phone.trim().length < 7)   e.phone   = l.invalid_phone;
    if (!channel)                  e.channel = l.choose_messenger;
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), channel }),
      });
      if (!res.ok) { setErrors({ global: l.error_network }); return; }
      const data = await res.json();
      setDevCode(data.dev_code ?? null);
      setTelegramLink(data.telegram_link ?? null);
      setStep(3);
    } catch {
      setErrors({ global: l.error_network });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!channel) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), channel }),
      });
      if (res.ok) {
        const d = await res.json();
        setDevCode(d.dev_code ?? null);
        setTelegramLink(d.telegram_link ?? null);
        setOtpCode("");
        clearErr("otp");
      }
    } finally { setLoading(false); }
  };

  // ── Verify OTP + create buy request ────────────────────────────────────────
  const submitOtp = async () => {
    if (otpCode.trim().length !== 6) { setErrors({ otp: l.invalid_otp }); return; }
    setLoading(true);
    try {
      // 1. Verify OTP → login buyer
      const verifyRes = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), channel, code: otpCode.trim(), full_name: name.trim() }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        const msg = (err.detail ?? "").toLowerCase().includes("expired") ? l.error_otp_expired : l.error_otp;
        setErrors({ otp: msg });
        return;
      }

      // 2. Create buy request (search subscription)
      const buyRes = await fetch(`${API}/api/v1/lands/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          region:        form.region || null,
          price_min_eur: form.price_min ? parseInt(form.price_min) : null,
          price_max_eur: form.price_max ? parseInt(form.price_max) : null,
          area_min_m2:   form.area_min  ? parseInt(form.area_min)  : null,
          area_max_m2:   form.area_max  ? parseInt(form.area_max)  : null,
          channels:      { [channel!]: phone.trim() },
        }),
      });
      if (buyRes.ok) {
        const buyData = await buyRes.json();
        setMatchCount(buyData.matching_listings ?? null);
      }

      setDone(true);
    } catch {
      setErrors({ otp: l.error_network });
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [l.step1, l.step2, l.step3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Success */}
        {done ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{l.success_title}</h3>
            {matchCount !== null && matchCount > 0 && (
              <div className="mb-3 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-semibold">
                {l.success_matched.replace("{n}", String(matchCount))}
              </div>
            )}
            <p className="text-gray-500 mb-6">{l.success_msg}</p>
            <button onClick={onClose}
              className="px-8 py-3 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors">
              {l.success_close}
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

            {/* Step indicator */}
            <div className="flex px-6 pt-4 gap-1">
              {STEPS.map((label, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step > s ? "bg-orange-500 text-white" : step === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                      {step > s ? "✓" : s}
                    </div>
                    <span className={`text-xs ${step >= s ? "text-orange-600 font-medium" : "text-gray-400"}`}>{label}</span>
                    {s < STEPS.length && <div className={`w-6 h-px mx-1 ${step > s ? "bg-orange-300" : "bg-gray-200"}`} />}
                  </div>
                );
              })}
            </div>

            {errors.global && (
              <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {errors.global}
              </div>
            )}

            {/* ── STEP 1: Search criteria ── */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-4">
                <Field label={l.region_label}>
                  <select value={form.region} onChange={(e) => set("region", e.target.value)} className={inp()}>
                    <option value="">{l.region_ph}</option>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={l.price_min_label}>
                    <input type="number" value={form.price_min} onChange={(e) => set("price_min", e.target.value)}
                      placeholder={l.price_ph} className={inp()} />
                  </Field>
                  <Field label={l.price_max_label}>
                    <input type="number" value={form.price_max} onChange={(e) => set("price_max", e.target.value)}
                      placeholder={l.price_ph} className={inp()} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={l.area_min_label}>
                    <input type="number" value={form.area_min} onChange={(e) => set("area_min", e.target.value)}
                      placeholder={l.area_ph} className={inp()} />
                  </Field>
                  <Field label={l.area_max_label}>
                    <input type="number" value={form.area_max} onChange={(e) => set("area_max", e.target.value)}
                      placeholder={l.area_ph} className={inp()} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── STEP 2: Contact + Messenger ── */}
            {step === 2 && (
              <div className="px-6 py-5 space-y-4">
                <Field label={l.name_label} error={errors.name}>
                  <input value={name} onChange={(e) => { setName(e.target.value); clearErr("name"); }}
                    placeholder={l.name_ph} className={inp(errors.name)} />
                </Field>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{l.messenger_label}</label>
                  <p className="text-xs text-gray-400 mb-3">{l.messenger_hint}</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {MESSENGERS.map((m) => (
                      <button key={m.id} type="button"
                        onClick={() => { setChannel(m.id); clearErr("channel"); }}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                          channel === m.id ? m.activeColor : m.color
                        }`}>
                        <span className="text-xl">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {errors.channel && <p className="text-xs text-red-500 mb-2">{errors.channel}</p>}

                  <Field label={l.phone_label} error={errors.phone}>
                    <input type="tel" value={phone}
                      onChange={(e) => { setPhone(e.target.value); clearErr("phone"); }}
                      placeholder={l.phone_ph} className={inp(errors.phone)} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── STEP 3: OTP ── */}
            {step === 3 && (
              <div className="px-6 py-5 space-y-5">
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">
                      {l.otp_hint} {MESSENGERS.find((m) => m.id === channel)?.icon} {MESSENGERS.find((m) => m.id === channel)?.label}
                    </p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{phone}</p>
                  </div>
                  <button onClick={() => { setStep(2); setOtpCode(""); clearErr("otp"); setTelegramLink(null); }}
                    className="text-xs text-orange-500 hover:underline font-medium">
                    {l.change_number}
                  </button>
                </div>

                {/* Telegram deep-link button */}
                {channel === "telegram" && telegramLink && (
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
                  >
                    <span className="text-lg">✈️</span>
                    {l.open_telegram_bot}
                  </a>
                )}
                {channel === "telegram" && telegramLink && (
                  <p className="text-xs text-gray-400 text-center -mt-2">
                    {l.telegram_hint}
                  </p>
                )}

                {devCode && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
                    [DEV] Код: <strong className="font-mono text-xl tracking-widest">{devCode}</strong>
                  </div>
                )}

                <Field label={l.otp_label} error={errors.otp}>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); clearErr("otp"); }}
                    placeholder={l.otp_ph}
                    className={`${inp(errors.otp)} text-center text-2xl font-mono tracking-[0.5em]`}
                    onKeyDown={(e) => e.key === "Enter" && submitOtp()}
                    autoFocus
                  />
                </Field>

                <button onClick={resendOtp} disabled={loading}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors disabled:opacity-50">
                  {l.btn_resend}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 pb-5 flex justify-between">
              <button
                onClick={() => {
                  if (step === 1) onClose();
                  else setStep((s) => (s - 1) as Step);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                {step === 1 ? l.cancel : l.back}
              </button>

              {step < 2 && (
                <button onClick={() => setStep((s) => (s + 1) as Step)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors">
                  {l.next}
                </button>
              )}
              {step === 2 && (
                <button onClick={goToOtp} disabled={loading}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {loading ? "…" : l.btn_send_code}
                </button>
              )}
              {step === 3 && (
                <button onClick={submitOtp} disabled={loading}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {loading ? "…" : l.btn_confirm}
                </button>
              )}
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
  return `w-full text-sm border ${err ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-orange-400"} rounded-xl px-3 py-2.5 focus:outline-none transition-colors`;
}
