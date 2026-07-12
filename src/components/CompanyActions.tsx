"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function postAction(payload: Record<string, unknown>) {
  const r = await fetch("/api/company/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export function PlanActions({ status, trialEndsAt }: { status: string | null; trialEndsAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const active = status === "trial" || status === "active";

  async function subscribe() {
    setBusy(true);
    await postAction({ type: "subscribe_plan" });
    setBusy(false);
    router.refresh();
  }
  async function cancel() {
    setBusy(true);
    await postAction({ type: "cancel_plan" });
    setBusy(false);
    setConfirmCancel(false);
    router.refresh();
  }

  if (active) {
    return (
      <div className="space-y-1">
        <span className="chip bg-brand-100 text-brand-700">
          ライトプラン({status === "trial" ? "トライアル中" : "有効"})
        </span>
        {trialEndsAt && status === "trial" && (
          <p className="text-xs text-slate-400">トライアル終了: {new Date(trialEndsAt).toLocaleDateString("ja-JP")}</p>
        )}
        {/* 解約は2クリック以内 */}
        {!confirmCancel ? (
          <button className="btn-outline !py-1 text-xs" onClick={() => setConfirmCancel(true)}>解約する</button>
        ) : (
          <button className="btn !py-1 bg-rose-600 text-xs text-white" disabled={busy} onClick={cancel}>
            解約を確定する
          </button>
        )}
      </div>
    );
  }
  return (
    <button className="btn-primary !py-1.5 text-sm" disabled={busy} onClick={subscribe}>
      ライトプランを開始(31日無料・クレカ登録モック)
    </button>
  );
}

export function ReplyForm({ reviewId, existing }: { reviewId: string; existing?: string }) {
  const router = useRouter();
  const [body, setBody] = useState(existing ?? "");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function submit() {
    const j = await postAction({ type: "reply", reviewId, body });
    if (j.ok) {
      setMsg("公開返信を保存しました");
      setOpen(false);
      router.refresh();
    } else setMsg(j.message ?? "失敗");
  }

  if (!open)
    return (
      <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        {existing ? "公開返信を編集" : "公開返信する"}
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea className="input h-20 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="全体に公開されます。投稿者を特定し得る情報は記載できません。" />
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={submit}>公開する</button>
        <button className="btn-outline !py-1 text-xs" onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}

export function ImprovementForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    const j = await postAction({ type: "improvement", reviewIds: [reviewId], body });
    if (j.ok) {
      setOpen(false);
      router.refresh();
    } else setMsg(j.message ?? "失敗");
  }
  if (!open)
    return (
      <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        改善済みバッジを付ける
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea className="input h-20 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="この指摘を受けて◯◯を改善しました" />
      <p className="text-[10px] text-slate-400">※「企業からの改善報告(自己申告)」として表示されます。虚偽は通報→バッジ取消の対象です。</p>
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={submit}>公開する</button>
        <button className="btn-outline !py-1 text-xs" onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}

export function ObjectionForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  async function submit() {
    const j = await postAction({ type: "objection", complaintId, reason });
    if (j.ok) {
      setMsg("異議を申し立てました(投稿者が判定します)");
      setOpen(false);
      router.refresh();
    } else setMsg(j.message ?? "失敗");
  }
  if (!open)
    return (
      <button className="text-xs text-slate-500 hover:underline" onClick={() => setOpen(true)}>
        事実と異なる(異議申し立て)
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea className="input h-16 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="事実と異なる点を具体的に" />
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={submit}>申し立てる</button>
        <button className="btn-outline !py-1 text-xs" onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {msg && <p className="text-xs text-slate-500">{msg}</p>}
    </div>
  );
}

export function ThreadReplyForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  async function submit() {
    const j = await postAction({ type: "thread_reply", complaintId, body });
    if (j.ok) {
      setBody("");
      router.refresh();
    }
  }
  return (
    <div className="flex gap-2">
      <input className="input !mt-0 flex-1 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="非公開スレッドへ返信" />
      <button className="btn-primary shrink-0 !py-1.5 text-xs" disabled={!body.trim()} onClick={submit}>返信</button>
    </div>
  );
}
