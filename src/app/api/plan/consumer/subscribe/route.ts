import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFlag } from "@/lib/flags";
import { paymentService } from "@/services";

export async function POST() {
  const monetization = await getFlag("monetization_enabled");
  if (!monetization) return NextResponse.json({ ok: false, code: "not_available" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const plan = await prisma.plan.findUnique({ where: { key: "consumer" } });
  const charge = await paymentService.charge(`consumer:${user.id}`, plan?.priceMonthly ?? 150);
  if (!charge.ok) return NextResponse.json({ ok: false, code: "payment_failed" }, { status: 400 });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await prisma.consumerSubscription.upsert({
    where: { userId: user.id },
    update: { status: "active", currentPeriodEnd: periodEnd },
    create: { userId: user.id, status: "active", currentPeriodEnd: periodEnd },
  });
  return NextResponse.json({ ok: true });
}
