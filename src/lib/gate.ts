// 閲覧ゲート(第5.2章)。純関数でテスト可能。

// 公開レビュー総数が200件を超えた時点でゲートON(201件目でON)。
export const GATE_THRESHOLD = 200;

export function shouldGateBeOn(publicReviewCount: number): boolean {
  return publicReviewCount > GATE_THRESHOLD;
}

// ゲートON前に発行された「review由来」ViewPass の有効期限は
// 「ゲートON日から1ヶ月」に読み替える(§5.2)。
// review以外(share/subscription)や、ゲートON後発行分は元の期限のまま。
// gateActivatedAt が null(ゲート未発動)の場合も元の期限をそのまま返す。
export function effectiveViewPassExpiry(
  pass: { createdAt: Date; expiresAt: Date; source?: string },
  gateActivatedAt: Date | null
): Date {
  const isReview = pass.source === undefined || pass.source === "review";
  if (isReview && gateActivatedAt && pass.createdAt < gateActivatedAt) {
    const readjusted = new Date(gateActivatedAt);
    readjusted.setMonth(readjusted.getMonth() + 1);
    return readjusted;
  }
  return pass.expiresAt;
}

export function isViewPassActive(
  pass: { createdAt: Date; expiresAt: Date; source?: string },
  gateActivatedAt: Date | null,
  now: Date = new Date()
): boolean {
  return effectiveViewPassExpiry(pass, gateActivatedAt) > now;
}

// 複数の閲覧権(ViewPass)+ 個人閲覧プランが重なる場合、
// 最も遅い有効期限を採用する(§4)。有効な権利が無ければ null。
export function latestAccessExpiry(
  passes: { createdAt: Date; expiresAt: Date; source?: string }[],
  subscriptionEnd: Date | null,
  gateActivatedAt: Date | null
): Date | null {
  const candidates: Date[] = [];
  for (const p of passes) candidates.push(effectiveViewPassExpiry(p, gateActivatedAt));
  if (subscriptionEnd) candidates.push(subscriptionEnd);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a > b ? a : b));
}
