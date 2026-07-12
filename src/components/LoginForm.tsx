"use client";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit() {
    const r = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await r.json();
    setSent(true);
    setDevLink(j.devLink ?? null);
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">メールアドレス</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user1@example.com" />
      </div>
      <button className="btn-primary w-full" disabled={!email} onClick={submit}>
        ログインリンクを送る
      </button>
      {sent && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          リンクを送信しました。メールをご確認ください。
          {devLink && (
            <div className="mt-2 text-xs">
              【開発用】
              <a href={devLink} className="break-all text-brand-700 underline">
                こちらからログイン
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
