import { sealCookie } from "@/lib/cookie-seal";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, isFreeMail } from "@/lib/password";
import { mailService } from "@/services";
import { COMPANY_COOKIE } from "@/lib/company-session";

// mode=register | login
export async function POST(req: NextRequest) {
  const { mode, email, password, corporateNumber } = await req.json();
  const em = String(email ?? "").toLowerCase();

  if (mode === "register") {
    if (isFreeMail(em)) {
      return NextResponse.json({ ok: false, message: "企業ドメインのメールをご利用ください(フリーメール不可)。" }, { status: 400 });
    }
    const exists = await prisma.companyUser.findUnique({ where: { email: em } });
    if (exists) return NextResponse.json({ ok: false, message: "登録済みのメールです。" }, { status: 400 });

    // 企業を法人番号で解決(マスタから昇格)
    let company = await prisma.company.findUnique({ where: { corporateNumber: String(corporateNumber) } });
    if (!company) {
      const m = await prisma.corporateMaster.findUnique({ where: { corporateNumber: String(corporateNumber) } });
      if (!m) return NextResponse.json({ ok: false, message: "法人番号が見つかりません。" }, { status: 400 });
      company = await prisma.company.create({
        data: {
          corporateNumber: m.corporateNumber,
          name: m.name,
          slug: `c${m.corporateNumber.slice(-6)}`,
          address: m.address,
          category: m.category,
        },
      });
    }
    const cu = await prisma.companyUser.create({
      data: { companyId: company.id, email: em, passwordHash: hashPassword(String(password)) },
    });
    // 企業ドメイン認証メール(MVP: 登録時に検証済み扱い)
    await prisma.company.update({ where: { id: company.id }, data: { domainVerified: true } });
    await mailService.send({
      to: em,
      subject: "【クレームソルブ】企業アカウント登録完了",
      body: `${company.name} の企業アカウントを登録しました。`,
      purpose: "company_register",
    });
    cookies().set(COMPANY_COOKIE, sealCookie(cu.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ ok: true });
  }

  // login
  const cu = await prisma.companyUser.findUnique({ where: { email: em } });
  if (!cu || !verifyPassword(String(password), cu.passwordHash)) {
    return NextResponse.json({ ok: false, message: "メールまたはパスワードが違います。" }, { status: 401 });
  }
  cookies().set(COMPANY_COOKIE, sealCookie(cu.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true });
}
