import { OUTCOME_LABELS, PRAISE_POINT_LABELS, deriveSolved, type Outcome, type PraisePoint } from "@/lib/scoring";
import { REPLY_SPEED_LABELS, EXTERNAL_CHANNEL_LABELS, yearMonthLabel } from "@/lib/labels";

export interface ReviewCardReview {
  id: string;
  satisfaction: number;
  outcome: string;
  wouldUseAgain: boolean;
  firstReplySpeed: string | null;
  transferCount: number | null;
  agentScore: number | null;
  supervisorScore: number | null;
  noEscalation: boolean;
  externalChannels: string;
  totalDays: number | null;
  comment: string;
  noResponseEval: boolean;
  complaint: {
    title: string;
    body: string;
    occurredYearMonth: string | null;
    lane: string;
    status: string;
  };
  reply?: { body: string } | null;
  user?: { kycStatus: string } | null;
  disputed?: boolean;
  actionNotes?: { id: string; body: string }[];
  resolutionBadge?: { praisePoints: string[]; praiseComment: string } | null;
  helpful?: boolean;
}

// 詳細評点を出すか(ゲート内=full)、代表レビューの要約か(summary)。
export function ReviewCard({
  review,
  detail = true,
}: {
  review: ReviewCardReview;
  detail?: boolean;
}) {
  const solved = deriveSolved(review.outcome as Outcome);
  const channels = review.externalChannels
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "none");
  // 対策(企業)+解決済み(投稿者)の両方が揃ったときのみ完全バッジ(§5.7)
  const hasAction = (review.actionNotes?.length ?? 0) > 0;
  const fullBadge = hasAction && !!review.resolutionBadge;

  return (
    <article className="card space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>{yearMonthLabel(review.complaint.occurredYearMonth) || "進行中案件"}</span>
        <div className="flex items-center gap-1">
          {review.user?.kycStatus === "verified" && (
            <span className="chip bg-emerald-50 text-emerald-700">本人確認済み</span>
          )}
          {review.disputed && (
            <span className="chip bg-rose-50 text-rose-700">係争中</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {fullBadge && (
          <span className="chip bg-emerald-600 text-white">✓ 対策・解決済み</span>
        )}
        {review.helpful && (
          <span className="chip bg-brand-50 text-brand-700">企業がこの指摘を参考にしました</span>
        )}
        <span className="text-sm font-bold text-slate-900">納得度 {review.satisfaction}/10</span>
        <span className={`chip ${solved ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
          {OUTCOME_LABELS[review.outcome as Outcome]}
        </span>
        <span className="chip bg-slate-100 text-slate-600">
          また使う: {review.wouldUseAgain ? "はい" : "いいえ"}
        </span>
        {review.noResponseEval && (
          <span className="chip bg-amber-50 text-amber-700">返答なしで評価</span>
        )}
      </div>

      {review.comment && <p className="whitespace-pre-wrap text-sm text-slate-700">{review.comment}</p>}
      <p className="whitespace-pre-wrap text-sm text-slate-600">{review.complaint.body}</p>

      {detail && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {review.firstReplySpeed && (
            <Row label="初回返答速度" value={REPLY_SPEED_LABELS[review.firstReplySpeed]} />
          )}
          {review.transferCount != null && <Row label="たらい回し" value={`${review.transferCount}回`} />}
          {review.agentScore != null && <Row label="担当者スコア" value={`${review.agentScore}/10`} />}
          <Row
            label="上長対応"
            value={review.noEscalation ? "エスカレーションなし" : review.supervisorScore != null ? `${review.supervisorScore}/10` : "—"}
          />
          {review.totalDays != null && <Row label="解決までの日数" value={`${review.totalDays}日`} />}
          {channels.length > 0 && (
            <Row
              label="外部窓口"
              value={channels.map((c) => EXTERNAL_CHANNEL_LABELS[c] ?? c).join("・")}
            />
          )}
        </dl>
      )}

      {/* 対策バッジ(企業の自己申告・ゲート外でも表示) */}
      {review.actionNotes?.map((n) => (
        <div key={n.id} className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
          <div className="chip bg-brand-100 text-brand-700">対策(企業からの自己申告)</div>
          <p className="mt-1 text-slate-700">{n.body}</p>
          <p className="mt-1 text-[10px] text-slate-400">
            ※企業からの自己申告です。クレソルが内容を検証したものではありません。
          </p>
        </div>
      ))}

      {/* 解決済みバッジ(投稿者のみが確定できる) */}
      {review.resolutionBadge && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div className="chip bg-emerald-100 text-emerald-800">解決済み(投稿者が確定)</div>
          {review.resolutionBadge.praisePoints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {review.resolutionBadge.praisePoints.map((p) => (
                <span key={p} className="chip bg-white text-emerald-700 ring-1 ring-emerald-200">
                  {PRAISE_POINT_LABELS[p as PraisePoint] ?? p}
                </span>
              ))}
            </div>
          )}
          {review.resolutionBadge.praiseComment && (
            <p className="mt-1 text-slate-700">{review.resolutionBadge.praiseComment}</p>
          )}
        </div>
      )}

      {/* 公開返信 */}
      {review.reply && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="font-semibold text-slate-700">企業からの公開返信</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{review.reply.body}</p>
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
