import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 通知の正直表示(v1.5 §1変更4)用: 企業の通知見込みを3状態で返す。
//   registered    = クレソルに登録済み(企業ユーザーあり or ドメイン認証済み)
//   has_notify    = 未登録だが通知先メールあり
//   no_contact    = 通知手段が不明
export async function GET(req: NextRequest) {
  const corporateNumber = req.nextUrl.searchParams.get("corporateNumber") ?? "";
  if (!corporateNumber) return NextResponse.json({ state: "no_contact" });

  const company = await prisma.company.findUnique({
    where: { corporateNumber },
    include: { companyUsers: { take: 1 } },
  });
  if (!company) {
    // 法人マスタのみ(未昇格)の企業は通知先不明
    return NextResponse.json({ state: "no_contact" });
  }
  if (company.companyUsers.length > 0 || company.domainVerified) {
    return NextResponse.json({ state: "registered" });
  }
  if (company.notifyEmail) {
    return NextResponse.json({ state: "has_notify" });
  }
  return NextResponse.json({ state: "no_contact" });
}
