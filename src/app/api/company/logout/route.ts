import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/company-session";

export async function POST() {
  cookies().delete(COMPANY_COOKIE);
  const base = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${base}/company-portal/login`, { status: 303 });
}
