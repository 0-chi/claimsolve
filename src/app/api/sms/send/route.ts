import { NextRequest, NextResponse } from "next/server";
import { smsService, MOCK_SMS_CODE } from "@/services";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ ok: false }, { status: 400 });
  await smsService.sendCode(String(phone));
  // モックでは固定コードをヒントとして返す(本番では返さない)
  return NextResponse.json({ ok: true, mockHint: MOCK_SMS_CODE });
}
