import { sealCookie } from "@/lib/cookie-seal";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { submitPastReview, PostError } from "@/lib/post";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    const result = await submitPastReview({ ...body, ipHash: ip, userAgent: ua });

    // セッション確立(投稿者=登録済み消費者)
    cookies().set(SESSION_COOKIE, sealCookie(result.userId), {
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
