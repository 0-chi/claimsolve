import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderationService } from "@/lib/moderation";

// 投稿者からの非公開スレッド返信(マジックトークン認証)。
export async function POST(req: NextRequest) {
  const { token, body } = await req.json();
  const mt = await prisma.magicToken.findUnique({ where: { token }, include: { complaint: true } });
  if (!mt || mt.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, code: "invalid_token" }, { status: 401 });
  }
  if (!moderationService.check(String(body ?? "")).ok) {
    return NextResponse.json({ ok: false, code: "ng_hard" }, { status: 400 });
  }
  await prisma.threadMessage.create({
    data: { complaintId: mt.complaintId, senderType: "user", body: String(body).slice(0, 2000) },
  });
  return NextResponse.json({ ok: true });
}
