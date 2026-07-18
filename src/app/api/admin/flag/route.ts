import { NextRequest, NextResponse } from "next/server";
import { setFlag, type FlagKey } from "@/lib/flags";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (!["gate_enabled", "monetization_enabled", "live_enabled"].includes(key)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await setFlag(key as FlagKey, !!value, "admin");
  await prisma.moderationLog.create({
    data: { actor: "admin", action: "set_flag", targetType: "flag", targetId: key, detail: String(value) },
  });
  return NextResponse.json({ ok: true });
}
