import { NextRequest, NextResponse } from "next/server";
import { corporateRegistry } from "@/services";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await corporateRegistry.search(q);
  return NextResponse.json({ results });
}
