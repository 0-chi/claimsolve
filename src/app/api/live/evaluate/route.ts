import { NextRequest, NextResponse } from "next/server";
import { submitLiveEvaluation } from "@/lib/live";
import { PostError } from "@/lib/post";

export async function POST(req: NextRequest) {
  try {
    const { token, review } = await req.json();
    const result = await submitLiveEvaluation(token, review);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PostError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
