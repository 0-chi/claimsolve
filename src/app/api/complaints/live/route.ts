import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { submitLiveComplaint } from "@/lib/live";
import { PostError } from "@/lib/post";
import { getFlag } from "@/lib/flags";
import { SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // live_enabled=OFF の間はライブ投稿導線を無効化(フラグ分岐で完全実装)
  if (!(await getFlag("live_enabled"))) {
    return NextResponse.json({ ok: false, code: "live_disabled" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const result = await submitLiveComplaint(body);
    const complaint = await prisma.complaint.findUnique({ where: { id: result.complaintId } });
    if (complaint) {
      cookies().set(SESSION_COOKIE, complaint.userId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PostError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
