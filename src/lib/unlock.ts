// ライブ評価解禁ロジック(第5.4章)。純関数でテスト可能。
//
// 解禁条件:
//   - 企業が返答した(firstReplyAt あり)→ 即解禁
//   - 返答が無くても、公開から一定日数の経過で解禁
//       企業の返答率 50%未満 = 7日 / 50%以上 = 14日
//       返答率が計算不能(null)な企業は 7日
//   判定は評価ボタン押下時点(now)で行う。

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function unlockThresholdDays(companyReplyRate: number | null): number {
  if (companyReplyRate == null) return 7;
  return companyReplyRate >= 50 ? 14 : 7;
}

export interface UnlockResult {
  unlocked: boolean;
  thresholdDays: number;
  unlockAt: Date | null; // 返答が無い場合の解禁予定日時
  reason: "company_replied" | "elapsed" | "waiting";
}

export function computeUnlock(
  input: {
    publishedAt: Date | null;
    firstReplyAt: Date | null;
    companyReplyRate: number | null;
  },
  now: Date = new Date()
): UnlockResult {
  const thresholdDays = unlockThresholdDays(input.companyReplyRate);

  if (input.firstReplyAt != null) {
    return { unlocked: true, thresholdDays, unlockAt: null, reason: "company_replied" };
  }

  if (input.publishedAt == null) {
    return { unlocked: false, thresholdDays, unlockAt: null, reason: "waiting" };
  }

  const unlockAt = new Date(input.publishedAt.getTime() + thresholdDays * MS_PER_DAY);
  if (now >= unlockAt) {
    return { unlocked: true, thresholdDays, unlockAt, reason: "elapsed" };
  }
  return { unlocked: false, thresholdDays, unlockAt, reason: "waiting" };
}
