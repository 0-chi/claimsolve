import { NextRequest, NextResponse } from "next/server";
import { confirmResolution } from "@/lib/live";
import { PostError } from "@/lib/post";

// 解決済みバッジの確定。マジックトークン(=投稿者本人)のみが呼べる。
export async function POST(req: NextRequest) {
  try {
    const { token, praisePoints, praiseComment } = await req.json();
    const result = await confirmResolution(token, { praisePoints, praiseComment });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PostError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
