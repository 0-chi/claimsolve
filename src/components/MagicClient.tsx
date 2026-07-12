"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";

interface Props {
  token: string;
  messages: { senderType: string; body: string }[];
  unlock: { unlocked: boolean; unlockAt: string | null; thresholdDays: number } | null;
  hasReview: boolean;
  objection: { id: string; reason: string; deadline: string } | null;
  disputed: boolean;
}

export default function MagicClient({ token, messages, unlock, hasReview, objection, disputed }: Props) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // 評価フォーム
  const [satisfaction, setSatisfaction] = useState(7);
  const [outcome, setOutcome] = useState<Outcome>("partial_refund");
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [comment, setComment] = useState("");
  const [evalError, setEvalError] = useState("");

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    await fetch("/api/live/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, body: reply }),
    });
    setReply("");
    setBusy(false);
    router.refresh();
  }

  async function submitEval() {
    setEvalError("");
    setBusy(true);
    const r = await fetch("/api/live/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        review: { satisfaction, outcome, wouldUseAgain, comment, externalChannels: ["none"] },
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) setEvalError(j.message ?? "評価に失敗しました。");
    else router.refresh();
  }

  async function respondObjection(decision: "keep" | "edit" | "hide", newBody?: string) {
    setBusy(true);
    await fetch("/api/live/objection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, objectionId: objection!.id, decision, newBody }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {disputed && (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
          企業が内容に異議を申し立てています(係争中バッジが公開表示されています)。
        </div>
      )}

      {/* 異議への回答(判定は投稿者本人) */}
      {objection && (
        <div className="card space-y-2 border-rose-200">
          <h2 className="text-sm font-bold text-rose-700">企業から異議が申し立てられています</h2>
          <p className="text-xs text-slate-500">理由: {objection.reason}</p>
          <p className="text-xs text-slate-400">
            回答期限: {new Date(objection.deadline).toLocaleDateString("ja-JP")}(無応答の場合は自動で非表示になります)
          </p>
          <ObjectionResponder busy={busy} onRespond={respondObjection} />
        </div>
      )}

      {/* 非公開スレッド */}
      <div className="card space-y-2">
        <h2 className="text-sm font-bold">非公開スレッド</h2>
        <div className="space-y-2">
          {messages.length === 0 && <p className="text-xs text-slate-400">まだメッセージはありません。</p>}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.senderType === "user"
                  ? "ml-auto bg-brand-100 text-slate-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <div className="text-[10px] text-slate-400">{m.senderType === "user" ? "あなた" : "企業"}</div>
              {m.body}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input !mt-0 flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="企業へのメッセージ" />
          <button className="btn-primary shrink-0" disabled={busy || !reply.trim()} onClick={sendReply}>
            送信
          </button>
        </div>
      </div>

      {/* 評価(解禁時) */}
      {!hasReview && (
        <div className="card space-y-3">
          <h2 className="text-sm font-bold">対応を評価する</h2>
          {unlock?.unlocked ? (
            <>
              <div>
                <label className="label">納得度(4〜10)</label>
                <input type="range" min={4} max={10} value={satisfaction} onChange={(e) => setSatisfaction(parseInt(e.target.value))} className="w-full" />
                <div className="text-center font-bold">{satisfaction}</div>
              </div>
              <div>
                <label className="label">解決結果</label>
                <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
                  {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => (
                    <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button className={`btn flex-1 ${wouldUseAgain ? "bg-brand-600 text-white" : "border border-slate-300"}`} onClick={() => setWouldUseAgain(true)}>また使う</button>
                <button className={`btn flex-1 ${!wouldUseAgain ? "bg-slate-700 text-white" : "border border-slate-300"}`} onClick={() => setWouldUseAgain(false)}>使わない</button>
              </div>
              <textarea className="input h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="公開コメント(任意)" />
              {evalError && <p className="text-sm text-rose-500">{evalError}</p>}
              <button className="btn-primary w-full" disabled={busy} onClick={submitEval}>評価を確定する</button>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              評価は企業の返答時、または
              {unlock?.unlockAt
                ? `${new Date(unlock.unlockAt).toLocaleDateString("ja-JP")}(公開から${unlock.thresholdDays}日)`
                : "一定期間経過後"}
              に解禁されます。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectionResponder({
  busy,
  onRespond,
}: {
  busy: boolean;
  onRespond: (d: "keep" | "edit" | "hide", newBody?: string) => void;
}) {
  const [mode, setMode] = useState<"" | "edit">("");
  const [newBody, setNewBody] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline text-xs" disabled={busy} onClick={() => onRespond("keep")}>
          維持する(係争中バッジ)
        </button>
        <button className="btn-outline text-xs" disabled={busy} onClick={() => setMode("edit")}>
          修正する
        </button>
        <button className="btn text-xs bg-slate-600 text-white" disabled={busy} onClick={() => onRespond("hide")}>
          非表示にする
        </button>
      </div>
      {mode === "edit" && (
        <div className="space-y-2">
          <textarea className="input h-24" value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="修正後の本文(修正は1回のみ・履歴が保持されます)" />
          <button className="btn-primary text-xs" disabled={busy || !newBody.trim()} onClick={() => onRespond("edit", newBody)}>
            修正を確定
          </button>
        </div>
      )}
    </div>
  );
}
