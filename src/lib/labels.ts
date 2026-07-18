// 表示ラベル・共通定数。
export const CATEGORY_LABELS: Record<string, string> = {
  subscription: "サブスク・解約",
  moving: "引越し",
  beauty: "美容・エステ",
  rental: "賃貸・退去",
  other: "その他",
};

export const REPLY_SPEED_LABELS: Record<string, string> = {
  same_day: "当日",
  within_3d: "3日以内",
  within_1w: "1週間以内",
  over_2w: "2週間超",
  none: "返答なし",
};

export const EXTERNAL_CHANNEL_LABELS: Record<string, string> = {
  consumer_center: "消費生活センター",
  adr: "ADR",
  lawyer: "弁護士",
  small_claims: "少額訴訟",
  court: "裁判所",
  none: "利用なし",
};

// live ステータスの日本語表示
export const LIVE_STATUS_LABELS: Record<string, string> = {
  pending_review: "承認待ち",
  published_unnotified: "未通知",
  published_awaiting: "未返答",
  replied: "返答あり",
  resolved: "解決",
  unresolved: "未解決",
  completion_requested: "対応完了申請中",
  awaiting_eval_paused: "評価保留(分母除外)",
  reopened: "再オープン",
  disputed: "係争中",
  frozen: "審査中",
  removed: "非表示",
};

export function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c;
}

// 発生時期の表示("YYYY-MM" → "YYYY年M月")
export function yearMonthLabel(ym: string | null | undefined): string {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}
