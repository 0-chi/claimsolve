import { loadMagicComplaint, evaluateUnlockState } from "@/lib/live";
import { LIVE_STATUS_LABELS, categoryLabel } from "@/lib/labels";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";
import MagicClient from "@/components/MagicClient";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "投稿者専用ページ | クレームソルブ", robots: { index: false } };

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

      {/* 公的窓口への案内(v1.5 §1変更5・常設) */}
      {c.lane === "live" && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold">まず公的窓口へ相談を。その記録をここに。</p>
          <p className="mt-1">
            消費者ホットライン <strong className="text-base">188</strong>(いやや)/最寄りの消費生活センター。
            専門相談員によるあっせん(企業への介入)は公的窓口だけができる対応です。
          </p>
        </div>
      )}

      <MagicClient
        token={params.token}
        lane={c.lane}
        messages={c.messages.map((m) => ({ senderType: m.senderType, body: m.body }))}
        unlock={unlock ? { unlocked: unlock.unlocked, unlockAt: unlock.unlockAt?.toISOString() ?? null, thresholdDays: unlock.thresholdDays } : null}
        hasReview={!!c.review}
        objection={
          openObjection
            ? { id: openObjection.id, reason: openObjection.reason, deadline: openObjection.userReplyDeadline.toISOString() }
            : null
        }
        disputed={c.objections.some((o) => o.status === "kept_disputed")}
        companyReplied={!!c.firstReplyAt}
        hasResolutionBadge={!!c.resolutionBadge}
        offer={
          c.resolutionOffer
            ? { body: c.resolutionOffer.body, status: c.resolutionOffer.status, companyName: c.company.name }
            : null
        }
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
