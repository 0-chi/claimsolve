import { prisma } from "@/lib/prisma";

// シェアによる24時間閲覧権(§5.2 / §5.3)。
export const SHARE_VIEWPASS_HOURS = 24;
export const SHARE_COOLDOWN_DAYS = 7; // 1ユーザーにつき7日に1回まで

// 便益提供の明示(景表法/ステマ規制対応)。編集不可の固定文言。
export const SHARE_DISCLOSURE = "クレソルの閲覧特典を利用しています";

// 金品・ポイント等の金銭的報酬は一切提供しない(閲覧権のみ)。

export function shareCooldownOk(lastShareAt: Date | null, now: Date = new Date()): boolean {
  if (!lastShareAt) return true;
  const next = new Date(lastShareAt.getTime() + SHARE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return now >= next;
}

export function nextShareAvailableAt(lastShareAt: Date): Date {
  return new Date(lastShareAt.getTime() + SHARE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export interface ShareResult {
  ok: boolean;
  reason?: "cooldown";
  expiresAt?: Date;
  nextAvailableAt?: Date;
}

// シェア押下＝24時間ViewPassを発行(検証不能なため押下で発行)。
export async function issueShareViewPass(
  userId: string,
  channel: string
): Promise<ShareResult> {
  const last = await prisma.shareEvent.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  if (!shareCooldownOk(last?.createdAt ?? null, now)) {
    return { ok: false, reason: "cooldown", nextAvailableAt: nextShareAvailableAt(last!.createdAt) };
  }

  await prisma.shareEvent.create({ data: { userId, channel } });
  const expiresAt = new Date(now.getTime() + SHARE_VIEWPASS_HOURS * 60 * 60 * 1000);
  await prisma.viewPass.create({
    data: { userId, source: "share", expiresAt },
  });
  return { ok: true, expiresAt };
}
