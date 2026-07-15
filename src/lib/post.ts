import { prisma } from "@/lib/prisma";
import { smsService, mailService } from "@/services";
import { moderationService } from "@/lib/moderation";
import {
  canPostBody,
  grantsViewPass,
  canAddReviewForCompany,
  canPostToday,
} from "@/lib/post-rules";
import { maybeAutoActivateGate } from "@/lib/flags";
import { maxWatchFor } from "@/lib/watch";
import { createHash, randomInt } from "node:crypto";
import type { Outcome } from "@/lib/scoring";

export class PostError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PastReviewInput {
  corporateNumber?: string; // 既存企業
  newCompany?: { name: string; category: string }; // 新規企業
  category: string;
  title: string;
  body: string;
  occurredYearMonth: string; // "YYYY-MM" 必須
  review: {
    satisfaction: number;
    outcome: Outcome;
    wouldUseAgain: boolean;
    inquiryCountToFirstContact?: number | null;
    noResponseFlag?: boolean;
    firstReplySpeed?: string | null;
    transferCount?: number | null;
    agentScore?: number | null;
    supervisorScore?: number | null;
    noEscalation?: boolean;
    externalChannels?: string[];
    totalDays?: number | null;
    comment?: string;
  };
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

async function resolveUser(account: PastReviewInput["account"]) {
  // 1電話番号 = 1アカウント
  const existing = await prisma.user.findUnique({ where: { phone: account.phone } });
  if (existing) {
    if (existing.bannedAt) {
      throw new PostError("banned", "この電話番号は利用できません。");
    }
    return existing;
  }
  // 新規: displayName / email の一意制約に注意
  const dupName = await prisma.user.findUnique({ where: { displayName: account.displayName } });
  if (dupName) throw new PostError("duplicate_name", "そのニックネームは使用されています。");
  const dupEmail = await prisma.user.findUnique({ where: { email: account.email } });
  if (dupEmail) throw new PostError("duplicate_email", "そのメールアドレスは登録済みです。");

  return prisma.user.create({
    data: {
      displayName: account.displayName,
      email: account.email,
      phone: account.phone,
    },
  });
}

async function resolveCompany(input: PastReviewInput) {
  if (input.corporateNumber) {
    const c = await prisma.company.findUnique({ where: { corporateNumber: input.corporateNumber } });
    if (c) return c;
    // マスタから昇格
    const m = await prisma.corporateMaster.findUnique({
      where: { corporateNumber: input.corporateNumber },
    });
    if (m) {
      return prisma.company.create({
        data: {
          corporateNumber: m.corporateNumber,
          name: m.name,
          slug: `c${m.corporateNumber.slice(-6)}`,
          address: m.address,
          category: m.category,
        },
      });
    }
    throw new PostError("company_not_found", "企業が見つかりません。");
  }
  if (input.newCompany) {
    // 未収載企業の新規登録
    const corporateNumber = "8" + String(randomInt(100000000000, 999999999999));
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

export async function submitPastReview(input: PastReviewInput) {
  // 1. SMS認証
  const verified = await smsService.verify(input.account.phone, input.account.code);
  if (!verified) throw new PostError("sms_invalid", "認証コードが正しくありません。");

  // 2. 本文の文字数下限
  if (!canPostBody(input.body)) {
    throw new PostError("too_short", "本文は50字以上で投稿してください。");
  }

  // 3. NGハードチェック(本文 + コメント)
  const modBody = moderationService.check(input.body);
  const modComment = moderationService.check(input.review.comment ?? "");
  if (!modBody.ok || !modComment.ok) {
    throw new PostError("ng_hard", "投稿できない表現が含まれています。");
  }

  // 4. ユーザー解決
  const user = await resolveUser(input.account);

  // 5. レート制限
  const todayCount = await prisma.complaint.count({
    where: { userId: user.id, createdAt: { gte: startOfToday() } },
  });
  if (!canPostToday(todayCount)) {
    throw new PostError("rate_day", "1日の投稿上限(2件)に達しています。");
  }

  // 6. 企業解決
  const company = await resolveCompany(input);

  // 7. 同一企業へのレビュー件数制限
  const companyReviewCount = await prisma.complaint.count({
    where: { userId: user.id, companyId: company.id, lane: "past" },
  });
  if (!canAddReviewForCompany(companyReviewCount)) {
    throw new PostError("rate_company", "同一企業へのレビューは2件までです。");
  }

  // 8. 公開処理(past はハードNGゼロで自動公開)
  const now = new Date();
  const complaint = await prisma.complaint.create({
    data: {
      userId: user.id,
      companyId: company.id,
      lane: "past",
      category: input.category,
      title: input.title,
      body: input.body,
      occurredYearMonth: input.occurredYearMonth,
      status: "published",
      publishedAt: now,
      ipHash: input.ipHash ? ipHashOf(input.ipHash) : null,
      userAgent: input.userAgent ?? null,
    },
  });

  const review = await prisma.review.create({
    data: {
      complaintId: complaint.id,
      companyId: company.id,
      userId: user.id,
      satisfaction: input.review.satisfaction,
      outcome: input.review.outcome,
      wouldUseAgain: input.review.wouldUseAgain,
      inquiryCountToFirstContact: input.review.inquiryCountToFirstContact ?? null,
      noResponseFlag: input.review.noResponseFlag ?? false,
      firstReplySpeed: input.review.firstReplySpeed ?? null,
      transferCount: input.review.transferCount ?? null,
      agentScore: input.review.agentScore ?? null,
      supervisorScore: input.review.supervisorScore ?? null,
      noEscalation: input.review.noEscalation ?? false,
      externalChannels: (input.review.externalChannels ?? []).join(","),
      totalDays: input.review.totalDays ?? null,
      comment: input.review.comment ?? "",
      publishedAt: now,
    },
  });

  // 9. 閲覧権(本文100字以上)+ 企業ウォッチ1社
  let viewPassGranted = false;
  if (grantsViewPass(input.body)) {
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    await prisma.viewPass.create({
      data: { userId: user.id, source: "review", expiresAt, sourceComplaintId: complaint.id },
    });
    // ウォッチ(上限は購読状況で可変。既に上限なら追加しない)
    const consumerSub = await prisma.consumerSubscription.findUnique({ where: { userId: user.id } });
    const subActive =
      !!consumerSub && consumerSub.status === "active" && consumerSub.currentPeriodEnd > new Date();
    const watchCount = await prisma.companyWatch.count({ where: { userId: user.id } });
    if (watchCount < maxWatchFor(subActive)) {
      await prisma.companyWatch.upsert({
        where: { userId_companyId: { userId: user.id, companyId: company.id } },
        update: {},
        create: { userId: user.id, companyId: company.id },
      });
    }
    viewPassGranted = true;
  }

  // 10. 企業通知は週次ダイジェストに集約(キュー投入)
  if (company.notifyEmail) {
    await mailService.send({
      to: company.notifyEmail,
      subject: "【クレームソルブ】新着レビューのお知らせ(週次ダイジェスト対象)",
      body: `${company.name} 宛に新しいレビューが投稿されました。週次ダイジェストにまとめてお届けします。`,
      purpose: "weekly_digest",
      status: "queued",
    });
  }

  // 11. 企業ウォッチャーへ新着レビュー通知(投稿者本人は除く)
  const watchers = await prisma.companyWatch.findMany({
    where: { companyId: company.id, userId: { not: user.id } },
    include: { user: true },
  });
  for (const w of watchers) {
    await mailService.send({
      to: w.user.email,
      subject: `【クレームソルブ】ウォッチ中の${company.name}に新着レビュー`,
      body: `${company.name} に新しいレビューが投稿されました。`,
      purpose: "watch_notify",
    });
  }

  // 12. ゲート自動発動チェック
  await maybeAutoActivateGate();

  return {
    userId: user.id,
    complaintId: complaint.id,
    reviewId: review.id,
    companyCorporateNumber: company.corporateNumber,
    companySlug: company.slug,
    viewPassGranted,
    softWarnings: [...modBody.soft, ...modComment.soft],
  };
}
