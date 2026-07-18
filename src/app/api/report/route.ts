import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { targetType, targetId, reason } = await req.json();
  if (!["complaint", "review", "reply", "note"].includes(targetType) || !targetId || !reason) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await prisma.report.create({
    data: { targetType, targetId, reason: String(reason).slice(0, 1000), status: "open" },
  });
  return NextResponse.json({ ok: true });
}
