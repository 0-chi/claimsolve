import { prisma } from "@/lib/prisma";
import { smsService, mailService } from "@/services";
import { moderationService } from "@/lib/moderation";
import { canPostBody } from "@/lib/post-rules";
import { computeUnlock } from "@/lib/unlock";
import { getCompanyReplyRate } from "@/lib/company-score";
import { deriveSolved, type Outcome } from "@/lib/scoring";
import { randomInt, randomBytes } from "node:crypto";
import { PostError } from "@/lib/post";

export interface LiveComplaintInputDTO {
  corporateNumber?: string;
  newCompany?: { name: string; category: string; notifyEmail?: string };
  category: string;
  title: string;
  body: string;
  desiredResolutions: string;
  occurredYearMonth: string; // 発生年月(occurredAt の代替入力)
  account: { displayName: string; email: string; phone: string; code: string };
}

async function resolveUserLive(account: LiveComplaintInputDTO["account"]) {
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

async function resolveCompanyLive(input: LiveComplaintInputDTO) {
  if (input.corporateNumber) {
    const c = await prisma.company.findUnique({ where: { corporateNumber: input.corporateNumber } });
    if (c) return c;
    const m = await prisma.corporateMaster.findUnique({
      where: { corporateNumber: input.corporateNumber },
    });
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
    const corporateNumber = "8" + String(randomInt(100000000000, 999999999999));
    return prisma.company.create({
      data: {
        corporateNumber,
        name: input.newCompany.name,
        slug: `new${corporateNumber.slice(-6)}`,
        address: "(投稿者申告・未確認)",
        category: input.newCompany.category || input.category,
        // メアド「なし」のlive案件は published_unnotified となりIR分母から除外
        notifyEmail: input.newCompany.notifyEmail || null,
      },
    });
  }
  throw new PostError("company_required", "企業を選択してください。");
}

export async function submitLiveComplaint(input: LiveComplaintInputDTO) {
  const verified = await smsService.verify(input.account.phone, input.account.code);
  if (!verified) throw new PostError("sms_invalid", "認証コードが正しくありません。");
  if (!canPostBody(input.body)) throw new PostError("too_short", "本文は50字以上で入力してください。");
  if (!moderationService.check(input.body).ok) throw new PostError("ng_hard", "投稿できない表現が含まれています。");

  const user = await resolveUserLive(input.account);
  const company = await resolveCompanyLive(input);

  // live は admin 承認後に公開・通知(status=pending_review)
  const [y, m] = input.occurredYearMonth.split("-").map((x) => parseInt(x, 10));
  const complaint = await prisma.complaint.create({
    data: {
      userId: user.id,
      companyId: company.id,
      lane: "live",
      category: input.category,
      title: input.title,
      body: input.body,
      desiredResolutions: input.desiredResolutions,
      occurredAt: y && m ? new Date(y, m - 1, 1) : new Date(),
      status: "pending_review",
    },
  });

  // マジックリンク(72時間・投稿者専用ページ)
  const token = randomBytes(18).toString("base64url");
  await prisma.magicToken.create({
    data: {
      userId: user.id,
      complaintId: complaint.id,
      token,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });

  const base = process.env.APP_URL || "http://localhost:3000";
  await mailService.send({
    to: user.email,
    subject: "【クレームソルブ】投稿を受け付けました",
    body: `専用ページ(72時間有効): ${base}/m/${token}`,
    purpose: "live_magic",
  });

  return { complaintId: complaint.id, token };
}

// マジックトークンから投稿者専用ページ用データを取得。
export async function loadMagicComplaint(token: string) {
  const mt = await prisma.magicToken.findUnique({
    where: { token },
    include: {
      complaint: {
        include: {
          company: true,
          messages: { orderBy: { createdAt: "asc" } },
          review: true,
          objections: { orderBy: { createdAt: "desc" } },
          resolutionBadge: true,
          resolutionOffer: true,
        },
      },
    },
  });
  if (!mt) return null;
  if (mt.expiresAt < new Date()) return { expired: true as const, mt: null };
  return { expired: false as const, mt };
}

// ---------------------------------------------------------------------------
// 解決済みバッジ(§5.7-(2))。投稿者だけが確定できる。
//   live: 企業の返信が記録された後
//   past: 「解決の申し出」に投稿者が応じた(accepted)後
// ---------------------------------------------------------------------------
export async function confirmResolution(
  token: string,
  input: { praisePoints?: string[]; praiseComment?: string }
) {
  const mt = await prisma.magicToken.findUnique({
    where: { token },
    include: { complaint: { include: { resolutionBadge: true, resolutionOffer: true } } },
  });
  if (!mt || mt.expiresAt < new Date()) throw new PostError("invalid_token", "リンクが無効です。");
  const c = mt.complaint;
  if (c.resolutionBadge) throw new PostError("already", "すでに解決済みバッジが付いています。");

  let source: "live_reply" | "past_offer";
  if (c.lane === "live") {
    if (!c.firstReplyAt) {
      throw new PostError("not_eligible", "企業の返信が記録された後に確定できます。");
    }
    source = "live_reply";
  } else if (c.lane === "past") {
    if (c.resolutionOffer?.status !== "accepted") {
      throw new PostError("not_eligible", "企業からの解決の申し出に応じた後に確定できます。");
    }
    source = "past_offer";
  } else {
    throw new PostError("not_eligible", "このレーンでは解決済みバッジを付けられません。");
  }

  const praiseComment = (input.praiseComment ?? "").trim();
  if (praiseComment && !moderationService.check(praiseComment).ok) {
    throw new PostError("ng_hard", "称賛コメントに投稿できない表現が含まれています。");
  }

  await prisma.resolutionBadge.create({
    data: {
      complaintId: c.id,
      confirmedByUserId: mt.userId,
      source,
      praisePoints: (input.praisePoints ?? []).join(","),
      praiseComment,
    },
  });
  if (c.lane === "live" && !["resolved", "unresolved"].includes(c.status)) {
    await prisma.complaint.update({ where: { id: c.id }, data: { status: "resolved" } });
  }
  return { source };
}

// 解決の申し出への応答(投稿者)。応じる/断る。断っても不利益はない。
export async function respondOffer(token: string, decision: "accept" | "decline") {
  const mt = await prisma.magicToken.findUnique({
    where: { token },
    include: { complaint: { include: { resolutionOffer: true } } },
  });
  if (!mt || mt.expiresAt < new Date()) throw new PostError("invalid_token", "リンクが無効です。");
  const offer = mt.complaint.resolutionOffer;
  if (!offer || offer.status !== "sent") {
    throw new PostError("not_found", "応答できる申し出がありません。");
  }
  await prisma.resolutionOffer.update({
    where: { id: offer.id },
    data: { status: decision === "accept" ? "accepted" : "declined", respondedAt: new Date() },
  });
  return { status: decision === "accept" ? "accepted" : "declined" };
}

// 評価解禁判定(企業返答 or 7/14日経過)。
export async function evaluateUnlockState(complaintId: string) {
  const c = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!c) return null;
  const replyRate = await getCompanyReplyRate(c.companyId);
  return computeUnlock(
    { publishedAt: c.publishedAt, firstReplyAt: c.firstReplyAt, companyReplyRate: replyRate },
    new Date()
  );
}

export interface LiveEvalInput {
  satisfaction: number;
  outcome: Outcome;
  wouldUseAgain: boolean;
  comment?: string;
  externalChannels?: string[];
}

export async function submitLiveEvaluation(token: string, review: LiveEvalInput) {
  const mt = await prisma.magicToken.findUnique({
    where: { token },
    include: { complaint: { include: { review: true } } },
  });
  if (!mt || mt.expiresAt < new Date()) throw new PostError("invalid_token", "リンクが無効です。");
  const complaint = mt.complaint;
  if (complaint.review) throw new PostError("already_evaluated", "すでに評価済みです。");

  const unlock = await evaluateUnlockState(complaint.id);
  if (!unlock?.unlocked) throw new PostError("locked", "まだ評価できません。");

  // 返答が無いまま経過解禁した評価は「返答なし評価」= IR返答済みに算入しない
  const noResponseEval = complaint.firstReplyAt == null;
  const now = new Date();
  const solved = deriveSolved(review.outcome);

  await prisma.review.create({
    data: {
      complaintId: complaint.id,
      companyId: complaint.companyId,
      userId: complaint.userId,
      satisfaction: review.satisfaction,
      outcome: review.outcome,
      wouldUseAgain: review.wouldUseAgain,
      comment: review.comment ?? "",
      externalChannels: (review.externalChannels ?? ["none"]).join(","),
      noResponseEval,
      publishedAt: now,
    },
  });
  await prisma.complaint.update({
    where: { id: complaint.id },
    data: { status: solved ? "resolved" : "unresolved", evalUnlockedAt: now },
  });
  return { solved };
}

// 異議への投稿者判定: 維持 / 修正 / 非表示(運営は判定者にならない)。
export async function respondObjection(
  token: string,
  objectionId: string,
  decision: "keep" | "edit" | "hide",
  newBody?: string
) {
  const mt = await prisma.magicToken.findUnique({ where: { token }, include: { complaint: true } });
  if (!mt || mt.expiresAt < new Date()) throw new PostError("invalid_token", "リンクが無効です。");
  const objection = await prisma.objection.findUnique({ where: { id: objectionId } });
  if (!objection || objection.complaintId !== mt.complaintId) {
    throw new PostError("not_found", "対象が見つかりません。");
  }

  if (decision === "keep") {
    // 維持 = 係争中バッジを公開表示
    await prisma.objection.update({
      where: { id: objectionId },
      data: { status: "kept_disputed", resolvedAt: new Date() },
    });
    await prisma.complaint.update({ where: { id: mt.complaintId }, data: { status: "disputed" } });
  } else if (decision === "hide") {
    await prisma.objection.update({
      where: { id: objectionId },
      data: { status: "hidden_by_user", resolvedAt: new Date() },
    });
    await prisma.complaint.update({ where: { id: mt.complaintId }, data: { status: "removed" } });
  } else if (decision === "edit") {
    // 修正 = この場合のみ1回編集可・修正履歴を保持
    if (!newBody || !moderationService.check(newBody).ok) {
      throw new PostError("ng_hard", "修正内容に問題があります。");
    }
    const complaint = await prisma.complaint.findUnique({ where: { id: mt.complaintId } });
    await prisma.objection.update({
      where: { id: objectionId },
      data: { status: "edited_by_user", resolvedAt: new Date() },
    });
    await prisma.complaint.update({
      where: { id: mt.complaintId },
      data: {
        // 修正履歴を body 先頭にコメントで残す簡易実装(履歴はモデレーションログにも保存)
        body: newBody,
      },
    });
    await prisma.moderationLog.create({
      data: {
        actor: "user",
        action: "objection_edit",
        targetType: "complaint",
        targetId: mt.complaintId,
        detail: `旧本文: ${complaint?.body?.slice(0, 200)}`,
      },
    });
  }
  return { decision };
}
