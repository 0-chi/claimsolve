import { NextRequest, NextResponse } from "next/server";
import { respondOffer } from "@/lib/live";
import { PostError } from "@/lib/post";

export async function POST(req: NextRequest) {
  try {
    const { token, decision } = await req.json();
    if (!["accept", "decline"].includes(decision)) {
      return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
    }
    const result = await respondOffer(token, decision);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PostError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
