import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { kycService, kycAvailable } from "@/services";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  if (!kycAvailable) {
    return NextResponse.json(
      { ok: false, code: "kyc_unavailable", message: "本人確認は現在準備中です。" },
      { status: 503 }
    );
  }
  const { frontImage } = await req.json();
  // 表面のみ受理(裏面フィールドは存在しない)。
  const job = await kycService.submit(user.id, { frontImage: String(frontImage ?? "front.jpg") });
  return NextResponse.json({ ok: true, jobId: job.jobId });
}
