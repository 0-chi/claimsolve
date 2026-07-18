// 消費者セッション + 閲覧アクセス判定。
// MVP: Cookie に userId を保存する軽量方式(重い認証ライブラリ不使用)。
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getFlag, getGateActivatedAt } from "@/lib/flags";
import { openCookie } from "@/lib/cookie-seal";
import { latestAccessExpiry } from "@/lib/gate";

export const SESSION_COOKIE = "cs_uid";

export async function getCurrentUser() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const uid = openCookie(raw);
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.bannedAt) return null;
  return user;
}

// 有効な閲覧権(ViewPass or 個人閲覧プラン)を持つか。
// 複数の権利が重なる場合は最も遅い有効期限で判定する(§4)。
export async function hasViewAccess(userId: string): Promise<boolean> {
  const sub = await prisma.consumerSubscription.findUnique({ where: { userId } });
  const subEnd =
    sub && sub.status === "active" && sub.currentPeriodEnd > new Date()
      ? sub.currentPeriodEnd
      : null;
  const passes = await prisma.viewPass.findMany({ where: { userId } });
  const gateActivatedAt = await getGateActivatedAt();
  const expiry = latestAccessExpiry(
    passes.map((p) => ({ createdAt: p.createdAt, expiresAt: p.expiresAt, source: p.source })),
    subEnd,
    gateActivatedAt
  );
  return expiry != null && expiry > new Date();
}

// 全レビュー(本文・詳細評点)を閲覧できるか。
// ゲートOFF: 誰でも閲覧可(SSRインデックス)。
// ゲートON: 閲覧権を持つ登録ユーザーのみ。
export async function canViewAllReviews(): Promise<{
  allowed: boolean;
  gateOn: boolean;
  userId: string | null;
}> {
  const gateOn = await getFlag("gate_enabled");
  const user = await getCurrentUser();
  if (!gateOn) return { allowed: true, gateOn, userId: user?.id ?? null };
  if (!user) return { allowed: false, gateOn, userId: null };
  const allowed = await hasViewAccess(user.id);
  return { allowed, gateOn, userId: user.id };
}
