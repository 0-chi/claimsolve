import { NextRequest, NextResponse } from "next/server";
import { moderationService } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  const result = await moderationService.check(String(text ?? ""));
  return NextResponse.json(result);
}
