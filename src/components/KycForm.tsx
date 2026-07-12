"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// マイナンバーカードは表面のみ。裏面(個人番号記載面)はアップロード不可。
export default function KycForm() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frontImage: fileName || "front.jpg" }),
    });
    setSubmitted(true);
    setBusy(false);
    // モックは3秒後に自動承認。少し待って再読込。
    setTimeout(() => router.refresh(), 3500);
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">本人確認書類・表面のみ</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        {/* 裏面アップロードの入力欄は設けない(仕様) */}
        <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
          ⚠️ マイナンバーカードは<strong>表面のみ</strong>をアップロードしてください。
          個人番号が記載された<strong>裏面はアップロードできません</strong>(受け付けません)。
        </p>
      </div>
      {!submitted ? (
        <button className="btn-primary w-full" disabled={busy || !fileName} onClick={submit}>
          {busy ? "送信中…" : "本人確認を申請する"}
        </button>
      ) : (
        <p className="text-sm text-emerald-700">
          申請を受け付けました。審査完了までお待ちください(モックは約3秒で自動承認)。
        </p>
      )}
    </div>
  );
}
