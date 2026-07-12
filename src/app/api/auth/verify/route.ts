import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMagic } from "@/lib/auth-token";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = verifyMagic(token);
  const base = process.env.APP_URL || req.nextUrl.origin;
  if (!userId) {
    return NextResponse.redirect(`${base}/login?error=invalid`);
  }
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.redirect(`${base}/`);
}
