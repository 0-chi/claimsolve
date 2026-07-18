"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyAuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [corporateNumber, setCorporateNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    const r = await fetch("/api/company/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, email, password, corporateNumber }),
    });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) {
      setError(j.message ?? "失敗しました。");
      return;
    }
    router.push("/company-portal");
  }

  return (
    <div className="card space-y-3">
      {mode === "register" && (
        <div>
          <label className="label">法人番号</label>
          <input className="input" value={corporateNumber} onChange={(e) => setCorporateNumber(e.target.value)} placeholder="13桁の法人番号" />
          <p className="mt-1 text-xs text-slate-400">シードのデモ企業例: 9000000000000</p>
        </div>
      )}
      <div>
        <label className="label">企業ドメインのメール</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@your-company.co.jp" />
        {mode === "register" && <p className="mt-1 text-xs text-slate-400">フリーメールは利用できません。</p>}
      </div>
      <div>
        <label className="label">パスワード</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !email || !password || (mode === "register" && !corporateNumber)} onClick={submit}>
        {busy ? "処理中…" : mode === "register" ? "企業登録する" : "ログイン"}
      </button>
    </div>
  );
}
