import { NextRequest, NextResponse } from "next/server";
import { smsService, smsIsMock, MOCK_SMS_CODE } from "@/services";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await smsService.sendCode(String(phone));
  if (!r.sent) {
    return NextResponse.json(
      { ok: false, message: "SMSを送信できませんでした。番号をご確認ください。" },
      { status: 502 }
    );
  }
  // モック利用時のみ固定コードをヒントとして返す(Twilio設定時は返さない)
  return NextResponse.json({ ok: true, ...(smsIsMock ? { mockHint: MOCK_SMS_CODE } : {}) });
}
