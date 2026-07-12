import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  await prisma.consumerSubscription.updateMany({
    where: { userId: user.id },
    data: { status: "canceled" },
  });
  return NextResponse.json({ ok: true });
}
