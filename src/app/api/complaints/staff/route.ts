import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { submitStaffReport } from "@/lib/staff";
import { PostError } from "@/lib/post";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    const result = await submitStaffReport({ ...body, ipHash: ip, userAgent: ua });
    cookies().set(SESSION_COOKIE, result.userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PostError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, code: "server_error", message: "エラーが発生しました。" }, { status: 500 });
  }
}
