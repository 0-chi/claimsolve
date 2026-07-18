// staff(担当者への申し出)レーン(§5.9)。
// 完全非公開: 公開ページ・企業ページ・sitemap・OGP・検索のいずれにも出さない。
// 用途は企業内の傾向把握であり、個人の処罰ではない。
import { prisma } from "@/lib/prisma";
import { smsService, mailService } from "@/services";
import { moderationService } from "@/lib/moderation";
import {
  canPostStaffBody,
  canPostToday,
  canAddStaffForCompany,
} from "@/lib/post-rules";
import { STAFF_CHANNELS, STAFF_ISSUES, type StaffChannel, type StaffIssue } from "@/lib/scoring";
import { PostError } from "@/lib/post";
import { createHash } from "node:crypto";

const STAFF_VIEWPASS_HOURS = 24; // staff 由来 ViewPass = 24時間
const FLOOD_WINDOW_HOURS = 24;
const FLOOD_THRESHOLD = 3; // 同一企業・同一部署へ24時間に3件以上で admin キューへ

export interface StaffInput {
  corporateNumber?: string;
  newCompany?: { name: string; category: string };
  category: string;
  department: string; // 部署/店舗名(必須)
  contactChannel: string; // phone | in_store | visit | chat(必須)
  contactedAt: string; // 接触日+時間帯(必須)例 "2026-07-01 午前"
  staffIssues?: string[]; // 任意
  body: string; // 80字以上
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

async function resolveUser(account: StaffInput["account"]) {
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

async function resolveCompany(input: StaffInput) {
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
    const corporateNumber = "6" + String(Math.floor(100000000000 + Math.random() * 899999999999));
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

export async function submitStaffReport(input: StaffInput) {
  // 1. SMS認証
  if (!(await smsService.verify(input.account.phone, input.account.code))) {
    throw new PostError("sms_invalid", "認証コードが正しくありません。");
  }
  // 2. 必須項目
  if (!input.department?.trim()) throw new PostError("department_required", "部署・店舗名を入力してください。");
  if (!STAFF_CHANNELS.includes(input.contactChannel as StaffChannel)) {
    throw new PostError("channel_required", "接触チャネルを選択してください。");
  }
  if (!input.contactedAt?.trim()) throw new PostError("contacted_at_required", "接触日時を入力してください。");
  // 3. 本文80字以上
  if (!canPostStaffBody(input.body)) {
    throw new PostError("too_short", "本文は80字以上で入力してください。");
  }
  // 4. NGハードチェック(個人名・電話番号等は既存ルールでブロック)
  const mod = await moderationService.check(`${input.body}\n${input.department}`);
  if (!mod.ok) throw new PostError("ng_hard", "投稿できない表現(個人名等)が含まれています。担当者名は書かず、日時と部署でお知らせください。");

  const issues = (input.staffIssues ?? []).filter((i) =>
    STAFF_ISSUES.includes(i as StaffIssue)
  );

  const user = await resolveUser(input.account);

  // 5. レート制限(全レーン合算 1日2件)
  const todayCount = await prisma.complaint.count({
    where: { userId: user.id, createdAt: { gte: startOfToday() } },
  });
  if (!canPostToday(todayCount)) throw new PostError("rate_day", "1日の投稿上限(2件)に達しています。");

  const company = await resolveCompany(input);

  // 6. 同一企業への staff は2件まで
  const staffCount = await prisma.complaint.count({
    where: { userId: user.id, companyId: company.id, lane: "staff" },
  });
  if (!canAddStaffForCompany(staffCount)) {
    throw new PostError("rate_company", "同一企業への担当者への申し出は2件までです。");
  }

  // 7. 作成(status=delivered。published は存在しない=公開されない)
  const now = new Date();
  const complaint = await prisma.complaint.create({
    data: {
      userId: user.id,
      companyId: company.id,
      lane: "staff",
      category: input.category,
      title: `担当者への申し出(${input.department})`,
      body: input.body,
      department: input.department.trim(),
      contactChannel: input.contactChannel,
      contactedAt: input.contactedAt.trim(),
      staffIssues: issues.join(","),
      status: "delivered",
      notifiedAt: now,
      ipHash: input.ipHash ? ipHashOf(input.ipHash) : null,
      userAgent: input.userAgent ?? null,
    },
  });

  // 8. 閲覧権 24時間
  const expiresAt = new Date(now.getTime() + STAFF_VIEWPASS_HOURS * 60 * 60 * 1000);
  await prisma.viewPass.create({
    data: { userId: user.id, source: "staff", expiresAt, sourceComplaintId: complaint.id },
  });

  // 9. 企業への着信通知(無料企業にも必ず届ける。本文は含めない)
  //    本文は事務連絡テンプレのまま、リンクURLにのみ計測パラメータ(v1.5 D-4)
  if (company.notifyEmail) {
    const base = process.env.APP_URL || "http://localhost:3000";
    await mailService.send({
      to: company.notifyEmail,
      subject: "【クレームソルブ】担当者への申し出が届いています",
      body: `${company.name} 宛に「担当者への申し出」が1件届きました。件数はダッシュボードでご確認いただけます。本申し出は公開されません。\n詳細: ${base}/business?from=notice`,
      purpose: "staff_notify",
      status: "approved",
    });
  }

  // 10. 連投検知: 同一企業・同一部署へ24時間に3件以上 → admin キュー
  const windowStart = new Date(now.getTime() - FLOOD_WINDOW_HOURS * 60 * 60 * 1000);
  const recentSameTarget = await prisma.complaint.count({
    where: {
      lane: "staff",
      companyId: company.id,
      department: complaint.department,
      createdAt: { gte: windowStart },
    },
  });
  if (recentSameTarget >= FLOOD_THRESHOLD) {
    await prisma.report.create({
      data: {
        targetType: "complaint",
        targetId: complaint.id,
        reason: `staff_flood: ${company.name} / ${complaint.department} へ24時間以内に${recentSameTarget}件`,
        status: "open",
      },
    });
  }

  // 注: staff はゲート判定(公開投稿数)に算入されないため maybeAutoActivateGate は呼ばない

  return {
    userId: user.id,
    complaintId: complaint.id,
    viewPassGranted: true,
  };
}
