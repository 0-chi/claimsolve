"use client";
import { useState } from "react";

export default function RequestForm() {
  const [kind, setKind] = useState("erasure");
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, detail, contact }),
    });
    setDone(true);
  }

  if (done)
    return (
      <div className="card bg-emerald-50 text-sm text-emerald-700">
        受け付けました。運営が内容を確認のうえ対応します。
      </div>
    );

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">請求の種類</label>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="erasure">消去請求(個人情報)</option>
          <option value="disclosure">発信者情報開示請求</option>
          <option value="other">その他</option>
        </select>
      </div>
      <div>
        <label className="label">対象・内容</label>
        <textarea className="input h-28" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
      <div>
        <label className="label">連絡先メール</label>
        <input className="input" type="email" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={!detail || !contact} onClick={submit}>
        送信する
      </button>
    </div>
  );
}
