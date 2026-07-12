"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsumerPlanActions({
  active,
  periodEnd,
  price,
}: {
  active: boolean;
  periodEnd: string | null;
  price: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function subscribe() {
    setBusy(true);
    await fetch("/api/plan/consumer/subscribe", { method: "POST" });
    setBusy(false);
    router.refresh();
  }
  async function cancel() {
    setBusy(true);
    await fetch("/api/plan/consumer/cancel", { method: "POST" });
    setBusy(false);
    setConfirmCancel(false);
    router.refresh();
  }

  if (active) {
    return (
      <div className="card space-y-2">
        <p className="text-sm text-emerald-700">ご利用中です。</p>
        {periodEnd && (
          <p className="text-xs text-slate-400">
            次回更新: {new Date(periodEnd).toLocaleDateString("ja-JP")}
          </p>
        )}
        {/* 解約は2クリック以内(ボタン→確認) */}
        {!confirmCancel ? (
          <button className="btn-outline w-full" onClick={() => setConfirmCancel(true)}>
            解約する
          </button>
        ) : (
          <button className="btn w-full bg-rose-600 text-white" disabled={busy} onClick={cancel}>
            {busy ? "処理中…" : "本当に解約する(確定)"}
          </button>
        )}
      </div>
    );
  }

  return (
    <button className="btn-primary w-full" disabled={busy} onClick={subscribe}>
      {busy ? "処理中…" : `月額${price}円で登録する(モック決済)`}
    </button>
  );
}
