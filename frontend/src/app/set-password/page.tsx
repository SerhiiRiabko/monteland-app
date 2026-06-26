"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function SetPasswordForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get("token") ?? "";

  const [info,     setInfo]     = useState<{ email: string; name: string } | null>(null);
  const [invalid,  setInvalid]  = useState(false);
  const [pw,       setPw]       = useState("");
  const [pw2,      setPw2]      = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  // Validate token on load
  useEffect(() => {
    if (!token) { setInvalid(true); return; }
    fetch(`${API}/api/v1/auth/verify-token?token=${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d ? setInfo({ email: d.email, name: d.name || "" }) : setInvalid(true))
      .catch(() => setInvalid(true));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pw.length < 8)    { setError("Мінімум 8 символів"); return; }
    if (pw !== pw2)        { setError("Паролі не співпадають"); return; }

    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password: pw, password_confirm: pw2 }),
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.detail ?? "Помилка. Спробуйте ще раз.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/"), 2500);
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (invalid) return (
    <Screen>
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-white mb-2">Ссылка недействительна</h2>
        <p className="text-white/60 mb-6 text-sm">Возможно, срок действия истёк.<br />Попробуйте создать объявление заново.</p>
        <a href="/" className="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors">
          На главную
        </a>
      </div>
    </Screen>
  );

  // ── Loading token check ────────────────────────────────────────────────────
  if (!info) return (
    <Screen>
      <div className="text-center text-white/50 text-sm">Проверяем ссылку…</div>
    </Screen>
  );

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) return (
    <Screen>
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Пароль установлен!</h2>
        <p className="text-white/60 text-sm">Перенаправляем на главную…</p>
      </div>
    </Screen>
  );

  // ── Set password form ──────────────────────────────────────────────────────
  return (
    <Screen>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔐</div>
        <h2 className="text-xl font-bold text-white">Установите пароль</h2>
        <p className="text-sm text-white/60 mt-1">
          {info.name && <><span className="font-medium text-white">{info.name}</span> · </>}
          {info.email}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Пароль</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            placeholder="Минимум 8 символов"
            autoFocus
            className={`w-full text-sm border ${error && pw.length < 8 ? "border-red-400" : "border-white/20"} bg-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Повторите пароль</label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => { setPw2(e.target.value); setError(""); }}
            placeholder="Введите пароль ещё раз"
            className={`w-full text-sm border ${error && pw !== pw2 ? "border-red-400" : "border-white/20"} bg-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50`}
          />
        </div>

        {/* Password strength hint */}
        {pw.length > 0 && (
          <div className="flex gap-1">
            {[1,2,3,4].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                pw.length >= i * 3
                  ? pw.length >= 12 ? "bg-green-500" : pw.length >= 8 ? "bg-orange-400" : "bg-red-400"
                  : "bg-white/10"
              }`} />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-sm font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-60 transition-colors"
        >
          {loading ? "Сохранение…" : "Сохранить пароль и войти"}
        </button>
      </form>

      <p className="text-xs text-white/50 text-center mt-4">
        После установки пароля вы сразу войдёте в систему.
      </p>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">🏔️</span>
          <span className="text-xl font-bold text-white">MonteLand</span>
        </a>
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Завантаження…</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}