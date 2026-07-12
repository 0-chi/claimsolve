"use client";
import { useState } from "react";

export default function WatchButton({
  companyId,
  initialWatched,
}: {
  companyId: string;
  initialWatched: boolean;
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function toggle() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, action: watched ? "unwatch" : "watch" }),
    });
    const j = await r.json();
    if (j.ok) setWatched(j.watched);
    else setMsg(j.message ?? "エラー");
    setBusy(false);
  }

  return (
    <div className="text-right">
      <button
        onClick={toggle}
        disabled={busy}
        className={`chip ${watched ? "bg-brand-100 text-brand-700" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
      >
        {watched ? "★ ウォッチ中" : "☆ ウォッチ"}
      </button>
      {msg && <p className="mt-1 text-[10px] text-rose-500">{msg}</p>}
    </div>
  );
}
