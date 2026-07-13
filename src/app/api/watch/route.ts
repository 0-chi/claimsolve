import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { maxWatchFor } from "@/lib/watch";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  const { companyId, action } = await req.json();

  if (action === "unwatch") {
    await prisma.companyWatch.deleteMany({ where: { userId: user.id, companyId } });
    return NextResponse.json({ ok: true, watched: false });
  }

  // 上限は購読状況で可変(投稿由来=1社 / 個人閲覧プラン加入中=5社)
  const sub = await prisma.consumerSubscription.findUnique({ where: { userId: user.id } });
  const subActive = !!sub && sub.status === "active" && sub.currentPeriodEnd > new Date();
  const maxWatch = maxWatchFor(subActive);

  const count = await prisma.companyWatch.count({ where: { userId: user.id } });
  const already = await prisma.companyWatch.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (!already && count >= maxWatch) {
    return NextResponse.json(
      { ok: false, code: "limit", message: `ウォッチは${maxWatch}社までです(個人閲覧プランで5社まで)` },
      { status: 400 }
    );
  }
  await prisma.companyWatch.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    update: {},
    create: { userId: user.id, companyId },
  });
  return NextResponse.json({ ok: true, watched: true });
}
