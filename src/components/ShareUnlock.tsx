"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// シェアで24時間の閲覧権を得る(§5.2)。
// 便益提供の明示は固定文言(編集不可)。金銭的報酬は提供しない。
const DISCLOSURE = "クレームソルブの閲覧特典を利用しています";

export default function ShareUnlock({ appUrl }: { appUrl: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function share(channel: "x" | "line") {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.code === "unauthorized") {
      setMsg("シェアでの解放にはログインが必要です。");
      return;
    }
    if (!j.ok && j.code === "cooldown") {
      setMsg(
        `シェアでの解放は7日に1回までです。次回: ${new Date(j.nextAvailableAt).toLocaleDateString("ja-JP")}`
      );
      return;
    }
    // 発行成功 → シェアウィンドウを開く(便益明示の固定文言を含む)
    const text = `企業のクレーム対応を評価するクレームソルブを見ています。${DISCLOSURE} #クレームソルブ`;
    const url =
      channel === "x"
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}`
        : `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(appUrl)}`;
    window.open(url, "_blank", "noopener");
    setMsg("24時間の閲覧権を付与しました。");
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button className="btn-outline flex-1" disabled={busy} onClick={() => share("x")}>
          Xでシェアして24時間閲覧
        </button>
        <button className="btn-outline flex-1" disabled={busy} onClick={() => share("line")}>
          LINEでシェア
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        シェア文面には「{DISCLOSURE}」が自動で入ります(編集不可・7日に1回)。金銭的報酬はありません。
      </p>
      {msg && <p className="text-[11px] text-brand-700">{msg}</p>}
    </div>
  );
}
