"use client";
import { useState } from "react";
import type { Lang } from "@/lib/translations";

interface Props {
  lang: Lang;
  onClose: () => void;
  onSwitchToSell: () => void;
}

type AuthMode = "login" | "register";
type AuthTab = "email" | "messenger";
type MessengerChannel = "whatsapp" | "viber" | "telegram";
type OtpStep = "phone" | "code";

const MESSENGERS: { id: MessengerChannel; label: string; color: string; icon: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-500 hover:bg-green-600", icon: "📱" },
  { id: "viber",    label: "Viber",    color: "bg-purple-600 hover:bg-purple-700", icon: "💜" },
  { id: "telegram", label: "Telegram", color: "bg-sky-500 hover:bg-sky-600",       icon: "✈️" },
];

const ui = {
  uk: {
    login_title: "Увійти",
    register_title: "Реєстрація",
    tab_email: "Email",
    tab_messenger: "Месенджер",
    email: "Email",
    email_ph: "you@example.com",
    password: "Пароль",
    password_ph: "Мінімум 8 символів",
    name: "Ваше ім'я",
    name_ph: "Ім'я та прізвище",
    btn_login: "Увійти",
    btn_register: "Зареєструватись",
    no_account: "Немає акаунту?",
    has_account: "Вже є акаунт?",
    switch_register: "Зареєструватись",
    switch_login: "Увійти",
    or: "або",
    sell_link: "Хочете продати ділянку?",
    forgot: "Забули пароль?",
    phone_label: "Номер телефону",
    phone_ph: "+382 12 345 678",
    choose_messenger: "Отримати код через:",
    otp_label: "Код з повідомлення",
    otp_ph: "6 цифр",
    btn_send_code: "Надіслати код",
    btn_confirm: "Підтвердити",
    btn_resend: "Надіслати ще раз",
    code_sent: "Код надіслано",
    change_phone: "Змінити номер",
    required: "Обов'язкове поле",
    invalid_email: "Невірний email",
    short_password: "Мінімум 8 символів",
    invalid_phone: "Введіть коректний номер",
    invalid_otp: "Код має містити 6 цифр",
    error_credentials: "Невірний email або пароль",
    error_exists: "Email вже зареєстрований",
    error_network: "Помилка з'єднання",
    error_otp_invalid: "Невірний код",
    error_otp_expired: "Код застарів — надішліть новий",
    open_telegram_bot: "Відкрити Telegram бот",
    telegram_hint: "Бот надішле вам код — введіть його нижче",
    known_channel_hint: "Ви вже входили через цей канал:",
    send_code_via: "Надіслати код у",
    use_different_channel: "Використати інший месенджер",
  },
  ru: {
    login_title: "Войти",
    register_title: "Регистрация",
    tab_email: "Email",
    tab_messenger: "Мессенджер",
    email: "Email",
    email_ph: "you@example.com",
    password: "Пароль",
    password_ph: "Минимум 8 символов",
    name: "Ваше имя",
    name_ph: "Имя и фамилия",
    btn_login: "Войти",
    btn_register: "Зарегистрироваться",
    no_account: "Нет аккаунта?",
    has_account: "Уже есть аккаунт?",
    switch_register: "Зарегистрироваться",
    switch_login: "Войти",
    or: "или",
    sell_link: "Хотите продать участок?",
    forgot: "Забыли пароль?",
    phone_label: "Номер телефона",
    phone_ph: "+382 12 345 678",
    choose_messenger: "Получить код через:",
    otp_label: "Код из сообщения",
    otp_ph: "6 цифр",
    btn_send_code: "Отправить код",
    btn_confirm: "Подтвердить",
    btn_resend: "Отправить ещё раз",
    code_sent: "Код отправлен",
    change_phone: "Изменить номер",
    required: "Обязательное поле",
    invalid_email: "Неверный email",
    short_password: "Минимум 8 символов",
    invalid_phone: "Введите корректный номер",
    invalid_otp: "Код должен содержать 6 цифр",
    error_credentials: "Неверный email или пароль",
    error_exists: "Email уже зарегистрирован",
    error_network: "Ошибка соединения",
    error_otp_invalid: "Неверный код",
    error_otp_expired: "Код устарел — запросите новый",
    open_telegram_bot: "Открыть Telegram бот",
    telegram_hint: "Бот пришлёт вам код — введите его ниже",
    known_channel_hint: "Вы уже входили через этот канал:",
    send_code_via: "Отправить код в",
    use_different_channel: "Использовать другой мессенджер",
  },
  en: {
    login_title: "Sign in",
    register_title: "Create account",
    tab_email: "Email",
    tab_messenger: "Messenger",
    email: "Email",
    email_ph: "you@example.com",
    password: "Password",
    password_ph: "At least 8 characters",
    name: "Your name",
    name_ph: "Full name",
    btn_login: "Sign in",
    btn_register: "Create account",
    no_account: "No account?",
    has_account: "Already have an account?",
    switch_register: "Create account",
    switch_login: "Sign in",
    or: "or",
    sell_link: "Want to sell a plot?",
    forgot: "Forgot password?",
    phone_label: "Phone number",
    phone_ph: "+382 12 345 678",
    choose_messenger: "Get code via:",
    otp_label: "Code from message",
    otp_ph: "6 digits",
    btn_send_code: "Send code",
    btn_confirm: "Confirm",
    btn_resend: "Send again",
    code_sent: "Code sent",
    change_phone: "Change number",
    required: "Required field",
    invalid_email: "Invalid email",
    short_password: "At least 8 characters",
    invalid_phone: "Enter a valid phone number",
    invalid_otp: "Code must be 6 digits",
    error_credentials: "Invalid email or password",
    error_exists: "Email already registered",
    error_network: "Connection error",
    error_otp_invalid: "Invalid code",
    error_otp_expired: "Code expired — request a new one",
    open_telegram_bot: "Open Telegram bot",
    telegram_hint: "The bot will send you a code — enter it below",
    known_channel_hint: "You've logged in via this channel before:",
    send_code_via: "Send code via",
    use_different_channel: "Use a different messenger",
  },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginModal({ lang, onClose, onSwitchToSell }: Props) {
  const l = ui[lang];

  // Email tab state
  const [mode, setMode] = useState<AuthMode>("login");
  const [tab, setTab] = useState<AuthTab>("email");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  // Messenger tab state
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<MessengerChannel | null>(null);
  const [detectedChannel, setDetectedChannel] = useState<MessengerChannel | null>(null);
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; delete n.global; return n; });
  };

  const clearError = (k: string) =>
    setErrors((e) => { const n = { ...e }; delete n[k]; delete n.global; return n; });

  // ── Auto-detect channel when phone is complete ──────────────────────────────
  const lookupChannel = async (p: string) => {
    if (p.trim().length < 7) { setDetectedChannel(null); return; }
    try {
      const res = await fetch(
        `${API}/api/v1/auth/messenger-channel?phone=${encodeURIComponent(p.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        setDetectedChannel(data.channel ?? null);
        if (data.channel) setChannel(data.channel);
      }
    } catch { /* silent — user picks manually */ }
  };

  // ── Email submit ────────────────────────────────────────────────────────────
  const validateEmail = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = l.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = l.invalid_email;
    if (!form.password) e.password = l.required;
    else if (form.password.length < 8) e.password = l.short_password;
    if (mode === "register" && !form.name) e.name = l.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitEmail = async () => {
    if (!validateEmail()) return;
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, full_name: form.name, role: "buyer" };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) setErrors({ global: l.error_credentials });
        else if (res.status === 409) setErrors({ global: l.error_exists });
        else setErrors({ global: err.detail ?? l.error_network });
        return;
      }
      onClose();
    } catch {
      setErrors({ global: l.error_network });
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: send code ──────────────────────────────────────────────────────────
  const sendOtp = async (ch: MessengerChannel) => {
    const p = phone.trim();
    if (p.length < 7) { setErrors({ phone: l.invalid_phone }); return; }
    setChannel(ch);
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/api/v1/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, channel: ch }),
      });
      if (!res.ok) { setErrors({ global: l.error_network }); return; }
      const data = await res.json();
      setDevCode(data.dev_code ?? null);
      setTelegramLink(data.telegram_link ?? null);
      setOtpStep("code");
    } catch {
      setErrors({ global: l.error_network });
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: verify code ────────────────────────────────────────────────────────
  const verifyOtp = async () => {
    if (otpCode.trim().length !== 6) { setErrors({ otp: l.invalid_otp }); return; }
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), channel, code: otpCode.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        const msg = err.detail?.toLowerCase().includes("expired")
          ? l.error_otp_expired
          : l.error_otp_invalid;
        setErrors({ otp: msg });
        return;
      }
      onClose();
    } catch {
      setErrors({ global: l.error_network });
    } finally {
      setLoading(false);
    }
  };

  const resetMessenger = () => {
    setOtpStep("phone");
    setChannel(null);
    setDetectedChannel(null);
    setOtpCode("");
    setDevCode(null);
    setTelegramLink(null);
    setErrors({});
  };

  const title = tab === "email"
    ? (mode === "login" ? l.login_title : l.register_title)
    : l.login_title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["email", "messenger"] as AuthTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrors({}); resetMessenger(); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "email" ? l.tab_email : l.tab_messenger}
            </button>
          ))}
        </div>

        {/* ── EMAIL TAB ── */}
        {tab === "email" && (
          <>
            <div className="px-6 py-5 space-y-4">
              {errors.global && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {errors.global}
                </div>
              )}

              {mode === "register" && (
                <Field label={l.name} error={errors.name}>
                  <input value={form.name} onChange={(e) => setField("name", e.target.value)}
                    placeholder={l.name_ph} className={inp(errors.name)} />
                </Field>
              )}

              <Field label={l.email} error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
                  placeholder={l.email_ph} className={inp(errors.email)} />
              </Field>

              <Field label={l.password} error={errors.password}>
                <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)}
                  placeholder={l.password_ph} className={inp(errors.password)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmail()} />
              </Field>

              {mode === "login" && (
                <div className="text-right">
                  <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{l.forgot}</button>
                </div>
              )}
            </div>

            <div className="px-6 pb-5 space-y-3">
              <button onClick={submitEmail} disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-60 transition-colors">
                {loading ? "…" : mode === "login" ? l.btn_login : l.btn_register}
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-100" />{l.or}<div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="text-center text-xs text-gray-500 space-y-1">
                <div>
                  {mode === "login" ? l.no_account : l.has_account}{" "}
                  <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }}
                    className="text-orange-500 font-medium hover:underline">
                    {mode === "login" ? l.switch_register : l.switch_login}
                  </button>
                </div>
                <div>
                  <button onClick={onSwitchToSell} className="text-gray-400 hover:text-orange-500 transition-colors">
                    {l.sell_link}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── MESSENGER TAB ── */}
        {tab === "messenger" && (
          <div className="px-6 py-5 space-y-5">
            {errors.global && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {errors.global}
              </div>
            )}

            {otpStep === "phone" && (
              <>
                <Field label={l.phone_label} error={errors.phone}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPhone(v);
                      clearError("phone");
                      setDetectedChannel(null);
                      setChannel(null);
                      // Auto-detect channel once number looks complete
                      if (v.trim().length >= 10) lookupChannel(v);
                    }}
                    onBlur={(e) => lookupChannel(e.target.value)}
                    placeholder={l.phone_ph}
                    className={inp(errors.phone)}
                  />
                </Field>

                {/* If channel auto-detected — show single prominent button */}
                {detectedChannel ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">{l.known_channel_hint}</p>
                    {MESSENGERS.filter((m) => m.id === detectedChannel).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => sendOtp(m.id)}
                        disabled={loading}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${m.color}`}
                      >
                        <span className="text-lg">{m.icon}</span>
                        {l.send_code_via} {m.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { setDetectedChannel(null); setChannel(null); }}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                    >
                      {l.use_different_channel}
                    </button>
                  </div>
                ) : (
                  /* New user — show all 3 options */
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-3">{l.choose_messenger}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {MESSENGERS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => sendOtp(m.id)}
                          disabled={loading}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-white text-xs font-semibold transition-colors disabled:opacity-60 ${m.color}`}
                        >
                          <span className="text-xl">{m.icon}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {otpStep === "code" && (
              <>
                <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{l.code_sent}</p>
                    <p className="text-sm font-semibold text-gray-800">{phone}</p>
                    <p className="text-xs text-gray-400">
                      via {MESSENGERS.find((m) => m.id === channel)?.icon}{" "}
                      {MESSENGERS.find((m) => m.id === channel)?.label}
                    </p>
                  </div>
                  <button onClick={resetMessenger} className="text-xs text-orange-500 hover:underline">
                    {l.change_phone}
                  </button>
                </div>

                {/* Telegram deep-link button */}
                {channel === "telegram" && telegramLink && (
                  <>
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
                    >
                      <span>✈️</span> {l.open_telegram_bot}
                    </a>
                    <p className="text-xs text-gray-400 text-center -mt-2">{l.telegram_hint}</p>
                  </>
                )}

                {devCode && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                    [DEV] Код: <strong className="font-mono text-base">{devCode}</strong>
                  </div>
                )}

                <Field label={l.otp_label} error={errors.otp}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); clearError("otp"); }}
                    placeholder={l.otp_ph}
                    className={`${inp(errors.otp)} text-center text-2xl font-mono tracking-[0.5em]`}
                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  />
                </Field>

                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? "…" : l.btn_confirm}
                </button>

                <button
                  onClick={() => channel && sendOtp(channel)}
                  disabled={loading}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {l.btn_resend}
                </button>
              </>
            )}

            <div className="text-center">
              <button onClick={onSwitchToSell} className="text-xs text-gray-400 hover:text-orange-500 transition-colors">
                {l.sell_link}
              </button>
            </div>
          </div>
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
