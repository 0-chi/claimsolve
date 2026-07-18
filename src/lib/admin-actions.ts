import { prisma } from "@/lib/prisma";
import { mailService } from "@/services";

const WARN_BAN_THRESHOLD = 3; // warn 3回でBAN

async function log(actor: string, action: string, targetType?: string, targetId?: string, detail?: string) {
  await prisma.moderationLog.create({
    data: { actor, action, targetType, targetId, detail },
  });
}

// BAN: 全投稿を非公開化 + 電話番号で再登録ブロック(bannedAt を立てる)。
export async function banUser(userId: string, reason: string, actor = "admin") {
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date() } });
  await prisma.complaint.updateMany({
    where: { userId },
    data: { status: "removed" },
  });
  await log(actor, "ban", "user", userId, reason);
}

// ストライク付与。severe=即BAN / warn=累積3でBAN。
export async function applyStrike(
  userId: string,
  severity: "warn" | "severe",
  reason: string,
  actor = "admin"
) {
  await prisma.strike.create({ data: { userId, severity, reason } });
  await log(actor, `strike_${severity}`, "user", userId, reason);

  if (severity === "severe") {
    await banUser(userId, `severe: ${reason}`, actor);
    return { banned: true };
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { strikes: { increment: 1 } },
  });
  if (user.strikes >= WARN_BAN_THRESHOLD) {
    await banUser(userId, `warn x${user.strikes}`, actor);
    return { banned: true };
  }
  return { banned: false, strikes: user.strikes };
}

// 企業スコアの凍結(審査中表示)。
export async function setCompanyFrozen(companyId: string, frozen: boolean, actor = "admin") {
  await prisma.company.update({ where: { id: companyId }, data: { frozen } });
  await log(actor, frozen ? "freeze_company" : "unfreeze_company", "company", companyId);
}

// live投稿の公開承認。企業メールがあれば通知(未通知/未返答へ)。
export async function approveLiveComplaint(complaintId: string, actor = "admin") {
  const c = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { company: true },
  });
  if (!c || c.lane !== "live") throw new Error("not a live complaint");

  const hasNotify = !!c.company.notifyEmail;
  const now = new Date();
  await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: hasNotify ? "published_awaiting" : "published_unnotified",
      publishedAt: now,
      notifiedAt: hasNotify ? now : null,
    },
  });
  if (hasNotify) {
    const base = process.env.APP_URL || "http://localhost:3000";
    await mailService.send({
      to: c.company.notifyEmail!,
      subject: "【クレームソルブ】進行中トラブルの通知",
      body: `${c.company.name} 宛に進行中のトラブルが届いています。非公開スレッドでご確認ください。\n詳細: ${base}/business?from=notice`,
      purpose: "live_notify",
      status: "approved",
    });
  }
  await log(actor, "approve_live", "complaint", complaintId);
}

// 新規宛先の企業通知メール承認(queued → sent)。
export async function approveEmail(emailLogId: string, actor = "admin") {
  await prisma.emailLog.update({ where: { id: emailLogId }, data: { status: "sent" } });
  await log(actor, "approve_email", "email", emailLogId);
}

export async function resolveReport(
  reportId: string,
  status: "reviewed" | "actioned" | "dismissed",
  actor = "admin"
) {
  await prisma.report.update({ where: { id: reportId }, data: { status } });
  await log(actor, `report_${status}`, "report", reportId);
}

// 異議の期限管理: 7日無応答で自動非表示(運営は判定者にならない・自動処理のみ)。
export async function autoHideExpiredObjections(actor = "system") {
  const now = new Date();
  const expired = await prisma.objection.findMany({
    where: { status: { in: ["open", "awaiting_user"] }, userReplyDeadline: { lt: now } },
  });
  for (const o of expired) {
    await prisma.objection.update({
      where: { id: o.id },
      data: { status: "auto_hidden_no_reply", resolvedAt: now },
    });
    await prisma.complaint.update({
      where: { id: o.complaintId },
      data: { status: "removed" },
    });
    await log(actor, "objection_auto_hidden", "objection", o.id);
  }
  return expired.length;
}
