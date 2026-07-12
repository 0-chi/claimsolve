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
