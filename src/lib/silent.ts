import { prisma } from "@/lib/prisma";
import { smsService, mailService } from "@/services";
import { moderationService } from "@/lib/moderation";
import { canPostBody, canPostToday, canAddSilentForCompany, validSilenceReasons } from "@/lib/post-rules";
import { SILENCE_REASONS, type SilenceReason } from "@/lib/scoring";
import { maybeAutoActivateGate } from "@/lib/flags";
import { PostError } from "@/lib/post";
import { createHash } from "node:crypto";

const SILENT_VIEWPASS_DAYS = 3; // silent 由来 ViewPass = 3日

export interface SilentInput {
  corporateNumber?: string;
  newCompany?: { name: string; category: string };
  category: string;
  title: string;
  body: string;
  occurredYearMonth: string;
  silenceReasons: string[]; // 1〜2個
  silentWouldUseAgain?: boolean | null; // 任意
  desiredOutcome?: string | null; // 任意
  account: { displayName: string; email: string; phone: string; code: string };
  ipHash?: string;
  userAgent?: string;
}

function ipHashOf(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function resolveUser(account: SilentInput["account"]) {
  const existing = await prisma.user.findUnique({ where: { phone: account.phone } });
  if (existing) {
    if (existing.bannedAt) throw new PostError("banned", "この電話番号は利用できません。");
    return existing;
  }
  const dupName = await prisma.user.findUnique({ where: { displayName: account.displayName } });
  if (dupName) throw new PostError("duplicate_name", "そのニックネームは使用されています。");
  const dupEmail = await prisma.user.findUnique({ where: { email: account.email } });
  if (dupEmail) throw new PostError("duplicate_email", "そのメールアドレスは登録済みです。");
  return prisma.user.create({
    data: { displayName: account.displayName, email: account.email, phone: account.phone },
  });
}

async function resolveCompany(input: SilentInput) {
  if (input.corporateNumber) {
    const c = await prisma.company.findUnique({ where: { corporateNumber: input.corporateNumber } });
    if (c) return c;
    const m = await prisma.corporateMaster.findUnique({ where: { corporateNumber: input.corporateNumber } });
    if (m)
      return prisma.company.create({
        data: {
          corporateNumber: m.corporateNumber,
          name: m.name,
          slug: `c${m.corporateNumber.slice(-6)}`,
          address: m.address,
          category: m.category,
        },
      });
    throw new PostError("company_not_found", "企業が見つかりません。");
  }
  if (input.newCompany) {
    const corporateNumber = "7" + String(Math.floor(100000000000 + Math.random() * 899999999999));
    return prisma.company.create({
      data: {
        corporateNumber,
        name: input.newCompany.name,
        slug: `new${corporateNumber.slice(-6)}`,
        address: "(投稿者申告・未確認)",
        category: input.newCompany.category || input.category,
      },
    });
  }
  throw new PostError("company_required", "企業を選択してください。");
}

export async function submitSilentReport(input: SilentInput) {
  // 1. SMS認証
  if (!(await smsService.verify(input.account.phone, input.account.code))) {
    throw new PostError("sms_invalid", "認証コードが正しくありません。");
  }
  // 2. 理由(1〜2個必須・3個目以降は不可)
  const reasons = Array.from(new Set(input.silenceReasons)).filter((r) =>
    SILENCE_REASONS.includes(r as SilenceReason)
  );
  if (!validSilenceReasons(reasons)) {
    throw new PostError("silence_reasons", "理由は1〜2つ選択してください。");
  }
  // 3. 本文50字以上
  if (!canPostBody(input.body)) throw new PostError("too_short", "本文は50字以上で入力してください。");
  // 4. NGハードチェック
  if (!moderationService.check(input.body).ok) {
    throw new PostError("ng_hard", "投稿できない表現が含まれています。");
  }

  const user = await resolveUser(input.account);

  // 5. レート制限(1日2件・全レーン合算)
  const todayCount = await prisma.complaint.count({
    where: { userId: user.id, createdAt: { gte: startOfToday() } },
  });
  if (!canPostToday(todayCount)) throw new PostError("rate_day", "1日の投稿上限(2件)に達しています。");

  const company = await resolveCompany(input);

  // 6. 同一企業への silent は1件まで
  const silentCount = await prisma.complaint.count({
    where: { userId: user.id, companyId: company.id, lane: "silent" },
  });
  if (!canAddSilentForCompany(silentCount)) {
    throw new PostError("rate_company", "同一企業への沈黙レポートは1件までです。");
  }

  // 7. 自動公開
  const now = new Date();
  const complaint = await prisma.complaint.create({
    data: {
      userId: user.id,
      companyId: company.id,
      lane: "silent",
      category: input.category,
      title: input.title,
      body: input.body,
      occurredYearMonth: input.occurredYearMonth,
      silenceReasons: reasons.join(","),
      silentWouldUseAgain: input.silentWouldUseAgain ?? null,
      desiredOutcome: input.desiredOutcome ?? null,
      status: "published",
      publishedAt: now,
      ipHash: input.ipHash ? ipHashOf(input.ipHash) : null,
      userAgent: input.userAgent ?? null,
    },
  });

  // 8. 閲覧権(本文50字以上で3日)。ウォッチ付与は無し。
  const expiresAt = new Date(now.getTime() + SILENT_VIEWPASS_DAYS * 24 * 60 * 60 * 1000);
  await prisma.viewPass.create({
    data: { userId: user.id, source: "silent", expiresAt, sourceComplaintId: complaint.id },
  });

  // 9. 企業通知は週次ダイジェストに必ず含める(反論機会=法的防御)
  if (company.notifyEmail) {
    await mailService.send({
      to: company.notifyEmail,
      subject: "【クレソル】お客様の声(週次ダイジェスト対象)",
      body: `${company.name} について「言わずに終わった不満(沈黙レポート)」が届いています。週次ダイジェストにまとめてお届けします。ご確認のうえ、必要に応じて異議申し立てが可能です。`,
      purpose: "weekly_digest_silent",
      status: "queued",
    });
  }

  await maybeAutoActivateGate();

  return {
    userId: user.id,
    complaintId: complaint.id,
    companyCorporateNumber: company.corporateNumber,
    companySlug: company.slug,
    viewPassGranted: true,
  };
}
