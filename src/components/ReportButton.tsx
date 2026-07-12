"use client";
import { useState } from "react";

export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setDone(true);
    setOpen(false);
  }

  if (done) return <span className="text-xs text-slate-400">通報を受け付けました</span>;

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-slate-400 hover:text-rose-600">
        通報する
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4">
            <h3 className="font-semibold">通報の理由</h3>
            <textarea
              className="input h-24"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="内容を具体的にお書きください"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-outline">
                キャンセル
              </button>
              <button onClick={submit} disabled={!reason.trim()} className="btn-primary">
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
