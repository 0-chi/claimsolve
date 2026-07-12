import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_WATCH = 5; // 1人5社まで

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  const { companyId, action } = await req.json();

  if (action === "unwatch") {
    await prisma.companyWatch.deleteMany({ where: { userId: user.id, companyId } });
    return NextResponse.json({ ok: true, watched: false });
  }

  const count = await prisma.companyWatch.count({ where: { userId: user.id } });
  const already = await prisma.companyWatch.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (!already && count >= MAX_WATCH) {
    return NextResponse.json(
      { ok: false, code: "limit", message: "ウォッチは5社までです" },
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
