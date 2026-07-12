import { loadMagicComplaint, evaluateUnlockState } from "@/lib/live";
import { LIVE_STATUS_LABELS, categoryLabel } from "@/lib/labels";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";
import MagicClient from "@/components/MagicClient";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "投稿者専用ページ | クレソル", robots: { index: false } };

export default async function MagicPage({ params }: { params: { token: string } }) {
  const loaded = await loadMagicComplaint(params.token);

  if (!loaded) {
    return <Fallback message="リンクが無効です。" />;
  }
  if (loaded.expired) {
    return <Fallback message="リンクの有効期限(72時間)が切れています。再発行してください。" />;
  }

  const { mt } = loaded;
  const c = mt.complaint;
  const unlock = await evaluateUnlockState(c.id);
  const openObjection = c.objections.find((o) =>
    ["open", "awaiting_user"].includes(o.status)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
        これはあなた専用のページです(第三者には非公開)。
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="chip bg-slate-100 text-slate-600">{categoryLabel(c.category)}</span>
          <span className="chip bg-sky-100 text-sky-700">
            {LIVE_STATUS_LABELS[c.status] ?? c.status}
          </span>
        </div>
        <h1 className="text-lg font-bold">{c.title}</h1>
        <p className="text-sm text-slate-600">{c.company.name}</p>
        <p className="whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
        {c.desiredResolutions && (
          <p className="text-xs text-slate-400">希望する解決: {c.desiredResolutions}</p>
        )}
      </div>

      {/* 既存の評価 */}
      {c.review && (
        <div className="card space-y-1">
          <h2 className="text-sm font-bold">あなたの評価</h2>
          <p className="text-sm">
            納得度 {c.review.satisfaction}/10 ・ {OUTCOME_LABELS[c.review.outcome as Outcome]}
          </p>
          {c.status === "resolved" && (
            <Link href={`/share/${c.id}`} className="btn-outline mt-2 inline-flex text-xs">
              解決シェアカードを見る
            </Link>
          )}
        </div>
      )}

      <MagicClient
        token={params.token}
        messages={c.messages.map((m) => ({ senderType: m.senderType, body: m.body }))}
        unlock={unlock ? { unlocked: unlock.unlocked, unlockAt: unlock.unlockAt?.toISOString() ?? null, thresholdDays: unlock.thresholdDays } : null}
        hasReview={!!c.review}
        objection={
          openObjection
            ? { id: openObjection.id, reason: openObjection.reason, deadline: openObjection.userReplyDeadline.toISOString() }
            : null
        }
        disputed={c.objections.some((o) => o.status === "kept_disputed")}
      />
    </div>
  );
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="card text-center">
      <p className="text-sm text-slate-600">{message}</p>
      <Link href="/" className="btn-outline mt-3 inline-flex">トップへ</Link>
    </div>
  );
}
