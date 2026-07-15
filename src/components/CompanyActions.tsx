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

// 対策バッジ(§5.7-(1))。80字以上必須・投稿に紐付け・ゲート外に公開される。
export function ActionNoteForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const len = body.trim().length;
  const remaining = Math.max(0, 80 - len);

  async function submit() {
    const j = await postAction({ type: "action_note", complaintIds: [complaintId], body });
    if (j.ok) {
      setOpen(false);
      router.refresh();
    } else setMsg(j.message ?? "失敗");
  }
  if (!open)
    return (
      <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        対策バッジを付ける
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea className="input h-24 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="この指摘を受けて、何を・いつ・どう変えたかを具体的に(80字以上)" />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{remaining > 0 ? `あと${remaining}字必要です` : `${len}/500字`}</span>
        <span>元の投稿本文とセットで常時公開されます</span>
      </div>
      <p className="text-[10px] text-slate-400">
        ※「企業からの自己申告」として表示されます。削除はできず、取り消しは履歴として公開されます。虚偽は通報→取消の対象です。
      </p>
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" disabled={len < 80 || len > 500} onClick={submit}>公開する</button>
        <button className="btn-outline !py-1 text-xs" onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}

// 「参考になった」マーク(§5.8)。1投稿1回・1日10件。
export function HelpfulButton({ complaintId, active }: { complaintId: string; active: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function toggle() {
    const j = await postAction({ type: active ? "helpful_retract" : "helpful", complaintId });
    if (j.ok) router.refresh();
    else setMsg(j.message ?? "失敗");
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        className={`text-xs hover:underline ${active ? "text-emerald-700" : "text-brand-700"}`}
        onClick={toggle}
      >
        {active ? "✓ 参考にしました(取り消す)" : "この指摘は参考になった"}
      </button>
      {msg && <span className="text-[10px] text-rose-500">{msg}</span>}
    </span>
  );
}

// 解決の申し出(§5.7-(3))。past のみ・1投稿1回・80字以上。
export function OfferForm({ complaintId, offered }: { complaintId: string; offered: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const len = body.trim().length;

  if (offered) return <span className="text-xs text-slate-400">解決の申し出: 送信済み</span>;

  async function submit() {
    const j = await postAction({ type: "offer", complaintId, body });
    if (j.ok) {
      setOpen(false);
      router.refresh();
    } else setMsg(j.message ?? "失敗");
  }
  if (!open)
    return (
      <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(true)}>
        解決の申し出を送る(1回のみ)
      </button>
    );
  return (
    <div className="space-y-2">
      <textarea className="input h-24 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="投稿者への申し出内容(80字以上)。連絡先は開示されず、応じるかは投稿者の自由です。" />
      <p className="text-[10px] text-slate-400">
        ※買っているのは「話しかける権利」です。解決済みバッジを付けるかどうかは投稿者だけが決められます。
      </p>
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" disabled={len < 80} onClick={submit}>送信する</button>
        <button className="btn-outline !py-1 text-xs" onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}

export function RetractNoteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function retract() {
    if (!window.confirm("取り消しますか?(取り消しは履歴として公開されます)")) return;
    setBusy(true);
    await postAction({ type: "retract_action_note", noteId });
    setBusy(false);
    router.refresh();
  }
  return (
    <button className="text-[10px] text-slate-400 hover:text-rose-600" disabled={busy} onClick={retract}>
      取り消す
    </button>
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
