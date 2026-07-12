// 閲覧ゲート(第5.2章)。純関数でテスト可能。

// 公開レビュー総数が200件を超えた時点でゲートON(201件目でON)。
export const GATE_THRESHOLD = 200;

export function shouldGateBeOn(publicReviewCount: number): boolean {
  return publicReviewCount > GATE_THRESHOLD;
}

// ゲートON前に発行された ViewPass の有効期限は「ゲートON日から3ヶ月」に読み替える。
// gateActivatedAt が null(ゲート未発動)の場合は元の期限をそのまま返す。
export function effectiveViewPassExpiry(
  pass: { createdAt: Date; expiresAt: Date },
  gateActivatedAt: Date | null
): Date {
  if (gateActivatedAt && pass.createdAt < gateActivatedAt) {
    const readjusted = new Date(gateActivatedAt);
    readjusted.setMonth(readjusted.getMonth() + 3);
    return readjusted;
  }
  return pass.expiresAt;
}

export function isViewPassActive(
  pass: { createdAt: Date; expiresAt: Date },
  gateActivatedAt: Date | null,
  now: Date = new Date()
): boolean {
  return effectiveViewPassExpiry(pass, gateActivatedAt) > now;
}
