// スコア仕様 v2(第7章)
// past/live 共通の Review から指標を算出する純関数。Prisma 非依存でテスト可能。

export type Outcome =
  | "full_refund"
  | "partial_refund"
  | "replacement"
  | "apology_only"
  | "no_action";

export const OUTCOME_LABELS: Record<Outcome, string> = {
  full_refund: "全額返金",
  partial_refund: "一部返金",
  replacement: "交換・再対応",
  apology_only: "謝罪のみ",
  no_action: "対応なし",
};

// solved 導出: no_action, apology_only → false / それ以外 → true(§4)
export function deriveSolved(outcome: Outcome): boolean {
  return outcome !== "no_action" && outcome !== "apology_only";
}

// RS 用: 解決到達 = no_action 以外(§7。apology_only は到達に含む)
export function reachedResolution(outcome: Outcome): boolean {
  return outcome !== "no_action";
}

export interface ScoreReviewInput {
  satisfaction: number; // 4〜10
  outcome: Outcome;
  wouldUseAgain: boolean;
}

// IR 算出用の live 案件(通知到達済みのみが分母)
export interface LiveComplaintInput {
  status: string;
  notifiedAt: Date | null;
  firstReplyAt: Date | null;
}

// IR の分母から除外する状態(§7)
const IR_EXCLUDED_STATUSES = new Set([
  "published_unnotified",
  "awaiting_eval_paused",
]);

export interface ScoreResult {
  reviewCount: number;
  aggregating: boolean; // レビュー5件未満 = 「集計中」
  ma: number | null; // 納得度平均(4〜10)
  rs: number | null; // 解決到達率(0〜100)
  in: number | null; // また使う率(0〜100)
  ir: number | null; // ライブ返答率(0〜100)。計算不能なら null
  ar: number | null; // 総合(0〜10、小数1桁)
  badge: ScoreBadge | null;
}

export type ScoreBadge = "excellent" | "good" | "fair" | "needs_improvement";

export const BADGE_LABELS: Record<ScoreBadge, string> = {
  excellent: "優良対応",
  good: "良好",
  fair: "普通",
  needs_improvement: "改善余地",
};

export function badgeForAr(ar: number): ScoreBadge {
  if (ar >= 8.0) return "excellent";
  if (ar >= 7.0) return "good";
  if (ar >= 6.0) return "fair";
  return "needs_improvement";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ライブ返答率(IR)。通知到達済み案件が無ければ null(計算不能)。
export function computeIr(liveComplaints: LiveComplaintInput[]): number | null {
  const eligible = liveComplaints.filter(
    (c) => c.notifiedAt != null && !IR_EXCLUDED_STATUSES.has(c.status)
  );
  if (eligible.length === 0) return null;
  const replied = eligible.filter((c) => c.firstReplyAt != null).length;
  return (replied / eligible.length) * 100;
}

// 企業スコアの算出。
// reviews: 集計対象(直近24ヶ月フィルタ済み)のレビュー配列
// liveComplaints: IR 用の live 案件配列
export function computeCompanyScore(
  reviews: ScoreReviewInput[],
  liveComplaints: LiveComplaintInput[] = []
): ScoreResult {
  const reviewCount = reviews.length;

  if (reviewCount < 5) {
    return {
      reviewCount,
      aggregating: true,
      ma: null,
      rs: null,
      in: null,
      ir: null,
      ar: null,
      badge: null,
    };
  }

  const ma =
    reviews.reduce((s, r) => s + r.satisfaction, 0) / reviewCount; // 4〜10
  const rs =
    (reviews.filter((r) => reachedResolution(r.outcome)).length / reviewCount) *
    100; // 0〜100
  const inRate =
    (reviews.filter((r) => r.wouldUseAgain).length / reviewCount) * 100; // 0〜100
  const ir = computeIr(liveComplaints); // 0〜100 or null

  let ar: number;
  if (ir == null) {
    // IR 計算不能: AR = (MA×10×3 + RS×3 + IN×2) ÷ 80
    ar = (ma * 10 * 3 + rs * 3 + inRate * 2) / 80;
  } else {
    // AR = (IR×2 + MA×10×3 + RS×3 + IN×2) ÷ 100
    ar = (ir * 2 + ma * 10 * 3 + rs * 3 + inRate * 2) / 100;
  }
  ar = round1(ar);

  return {
    reviewCount,
    aggregating: false,
    ma: round1(ma),
    rs: Math.round(rs),
    in: Math.round(inRate),
    ir: ir == null ? null : Math.round(ir),
    ar,
    badge: badgeForAr(ar),
  };
}

// ---------------------------------------------------------------------------
// silent(沈黙レポート)指標: SR(沈黙率)/ UR(窓口不達率)(§7.2, §7.3)
// AR には一切算入しない別枠指標。
// ---------------------------------------------------------------------------

export const SILENCE_REASONS = [
  "too_much_hassle",
  "no_contact_found",
  "could_not_reach",
  "no_reply_received",
  "felt_pointless",
  "feared_conflict",
  "ongoing_relationship",
  "not_worth_it",
  "too_late",
  "my_own_fault",
  "other",
] as const;
export type SilenceReason = (typeof SILENCE_REASONS)[number];

export const SILENCE_REASON_LABELS: Record<SilenceReason, string> = {
  too_much_hassle: "面倒だった・時間がなかった",
  no_contact_found: "連絡先が分からなかった・見つけられなかった",
  could_not_reach: "電話やフォームが繋がらなかった",
  no_reply_received: "問い合わせたが、返事が来なかった",
  felt_pointless: "言っても無駄だと思った",
  feared_conflict: "揉めるのが怖かった",
  ongoing_relationship: "今後も利用するので、関係を壊したくなかった",
  not_worth_it: "金額が小さく、割に合わなかった",
  too_late: "期限が過ぎていた・手遅れだった",
  my_own_fault: "自分にも非があると思った",
  other: "その他",
};

// 窓口不達(unreachable)グループ。UR の算出に用いる。
export const UNREACHABLE_REASONS: SilenceReason[] = [
  "no_contact_found",
  "could_not_reach",
  "no_reply_received",
];

export const SILENT_MIN_FOR_STATS = 5; // 5件未満は非表示

export interface SilentStats {
  total: number; // past + live + silent の総件数
  silentCount: number;
  sr: number | null; // 沈黙率(0〜100)。総件数5件未満は null
  ur: number | null; // 窓口不達率(0〜100)。silent5件未満は null
  unreachableBreakdown: Record<"no_contact_found" | "could_not_reach" | "no_reply_received", number>;
}

// SR = silent ÷ (past+live+silent) ×100 / UR = unreachable ÷ silent ×100
export function computeSilentStats(
  totalComplaints: number,
  silentReasonsList: string[][] // silent各件の理由配列
): SilentStats {
  const silentCount = silentReasonsList.length;
  const breakdown = { no_contact_found: 0, could_not_reach: 0, no_reply_received: 0 };
  let unreachableCount = 0;
  for (const reasons of silentReasonsList) {
    const hitUnreachable = reasons.some((r) => UNREACHABLE_REASONS.includes(r as SilenceReason));
    if (hitUnreachable) unreachableCount++;
    for (const key of Object.keys(breakdown) as (keyof typeof breakdown)[]) {
      if (reasons.includes(key)) breakdown[key]++;
    }
  }

  return {
    total: totalComplaints,
    silentCount,
    sr: totalComplaints >= SILENT_MIN_FOR_STATS ? Math.round((silentCount / totalComplaints) * 100) : null,
    ur:
      silentCount >= SILENT_MIN_FOR_STATS
        ? Math.round((unreachableCount / silentCount) * 100)
        : null,
    unreachableBreakdown: breakdown,
  };
}

// ---------------------------------------------------------------------------
// staff(担当者への申し出)enum(§4)。完全非公開レーン。スコア非算入。
// ---------------------------------------------------------------------------

export const STAFF_CHANNELS = ["phone", "in_store", "visit", "chat"] as const;
export type StaffChannel = (typeof STAFF_CHANNELS)[number];
export const STAFF_CHANNEL_LABELS: Record<StaffChannel, string> = {
  phone: "電話",
  in_store: "店頭",
  visit: "訪問",
  chat: "チャット",
};

export const STAFF_ISSUES = [
  "high_handed",
  "interrupted",
  "bounced_around",
  "promise_broken",
  "false_explanation",
  "dismissive",
  "too_slow",
] as const;
export type StaffIssue = (typeof STAFF_ISSUES)[number];
export const STAFF_ISSUE_LABELS: Record<StaffIssue, string> = {
  high_handed: "言い方が高圧的だった",
  interrupted: "話を遮られた",
  bounced_around: "たらい回しにされた",
  promise_broken: "約束が守られなかった",
  false_explanation: "説明が事実と違った",
  dismissive: "個人的な事情を軽視された",
  too_slow: "対応が遅すぎた",
};

// 解決済みバッジの「良かった点」(§5.7-(2))
export const PRAISE_POINTS = [
  "fast_response",
  "listened_well",
  "clear_explanation",
  "beyond_expectation",
  "good_attitude",
  "prevention_explained",
] as const;
export type PraisePoint = (typeof PRAISE_POINTS)[number];
export const PRAISE_POINT_LABELS: Record<PraisePoint, string> = {
  fast_response: "対応が早かった",
  listened_well: "話をちゃんと聞いてくれた",
  clear_explanation: "説明が分かりやすかった",
  beyond_expectation: "期待以上の対応だった",
  good_attitude: "担当者の態度が良かった",
  prevention_explained: "再発防止まで説明してくれた",
};

// ---------------------------------------------------------------------------
// CR(対策報告率)(§7.4)。常時公開位置に表示。AR には算入しない。
// 改善余地レビュー = 納得度6以下(4・5・6)の past/live レビュー。
// ---------------------------------------------------------------------------

export const CR_LOW_SATISFACTION_MAX = 6;
export const CR_MIN_FOR_STATS = 5; // 改善余地レビュー5件未満は非表示

export interface CrStats {
  lowReviewTotal: number; // 改善余地レビューの総件数(分母)
  lowReviewWithAction: number; // うち対策バッジ(published)が紐付いた件数
  cr: number | null; // 0〜100。分母5件未満は null(集計中)
  retractedCount: number; // 取り消された対策報告の件数(併記)
}

export function computeCr(
  lowReviews: { hasPublishedAction: boolean }[],
  retractedCount: number
): CrStats {
  const total = lowReviews.length;
  const withAction = lowReviews.filter((r) => r.hasPublishedAction).length;
  return {
    lowReviewTotal: total,
    lowReviewWithAction: withAction,
    cr: total >= CR_MIN_FOR_STATS ? Math.round((withAction / total) * 100) : null,
    retractedCount,
  };
}

// 直近24ヶ月フィルタ(集計対象)。
// past は発生時期(occurredYearMonth "YYYY-MM")、live は評価確定日で判定。
export function within24Months(
  ref: { occurredYearMonth?: string | null; evalDate?: Date | null },
  now: Date = new Date()
): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 24);

  if (ref.evalDate) {
    return ref.evalDate >= cutoff;
  }
  if (ref.occurredYearMonth) {
    const [y, m] = ref.occurredYearMonth.split("-").map((x) => parseInt(x, 10));
    if (!y || !m) return false;
    // 月末で比較(その月に発生した扱い)
    const d = new Date(y, m - 1, 1);
    const cutoffMonth = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
    return d >= cutoffMonth;
  }
  return false;
}
