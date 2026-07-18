import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 削除・開示請求は admin キュー⑤へ(Report として登録)。
export async function POST(req: NextRequest) {
  const { kind, detail, contact } = await req.json();
  await prisma.report.create({
    data: {
      targetType: "complaint",
      targetId: "request",
      reason: `[${kind}] ${detail} / 連絡先: ${contact}`.slice(0, 1000),
      status: "open",
    },
  });
  return NextResponse.json({ ok: true });
}
