import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { issueShareViewPass, SHARE_DISCLOSURE } from "@/lib/share";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  const { channel } = await req.json();
  const ch = ["x", "line", "other"].includes(channel) ? channel : "other";
  const result = await issueShareViewPass(user.id, ch);
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      code: result.reason,
      nextAvailableAt: result.nextAvailableAt?.toISOString(),
    });
  }
  return NextResponse.json({
    ok: true,
    expiresAt: result.expiresAt?.toISOString(),
    disclosure: SHARE_DISCLOSURE,
  });
}
