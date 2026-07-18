import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailService } from "@/services";
import { signMagic } from "@/lib/auth-token";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: String(email ?? "") } });
  // ユーザー有無に関わらず同じ応答(列挙攻撃対策)
  let devLink: string | undefined;
  if (user && !user.bannedAt) {
    const token = signMagic(user.id);
    const base = process.env.APP_URL || "http://localhost:3000";
    const link = `${base}/api/auth/verify?token=${token}`;
    await mailService.send({
      to: user.email,
      subject: "【クレームソルブ】ログインリンク",
      body: `以下のリンクからログインしてください(72時間有効)。\n${link}`,
      purpose: "magic_login",
    });
    // 開発利便のためリンクを返す(本番では返さない)
    if (process.env.NODE_ENV !== "production") devLink = link;
  }
  return NextResponse.json({ ok: true, devLink });
}
