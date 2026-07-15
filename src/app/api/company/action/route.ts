import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCompanyUser, companyHasLightPlan } from "@/lib/company-session";
import { moderationService } from "@/lib/moderation";
import { paymentService, mailService } from "@/services";
import {
  validActionNoteBody,
  validOfferBody,
  canAddHelpfulToday,
} from "@/lib/post-rules";
import { randomBytes } from "node:crypto";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(req: NextRequest) {
  const cu = await getCurrentCompanyUser();
  if (!cu) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  const companyId = cu.companyId;
  const body = await req.json();
  const { type } = body;

  const requireLight = async () => {
    if (!(await companyHasLightPlan(companyId))) {
      throw { code: "plan_required", message: "ライトプランが必要です。" };
    }
  };
  const ngCheck = (text: string) => {
    if (!moderationService.check(text).ok) throw { code: "ng_hard", message: "投稿できない表現が含まれます。" };
  };

  try {
    switch (type) {
      case "reply": {
        await requireLight();
        ngCheck(body.body);
        const review = await prisma.review.findUnique({ where: { id: body.reviewId } });
        if (!review || review.companyId !== companyId) throw { code: "forbidden" };
        await prisma.reviewReply.upsert({
          where: { reviewId: body.reviewId },
          update: { body: body.body },
          create: { reviewId: body.reviewId, companyId, body: body.body },
        });
        break;
      }

      // 対策バッジ(§5.7-(1)): 80字以上・投稿への紐付け必須
      case "action_note": {
        await requireLight();
        if (!validActionNoteBody(body.body ?? "")) {
          throw { code: "body_length", message: "対策の内容は80字以上500字以下で記載してください。" };
        }
        ngCheck(body.body);
        const complaintIds: string[] = Array.from(new Set(body.complaintIds ?? []));
        if (complaintIds.length < 1) {
          throw { code: "link_required", message: "対策バッジは必ず投稿に紐付けてください。" };
        }
        const complaints = await prisma.complaint.findMany({
          where: { id: { in: complaintIds }, companyId },
        });
        if (complaints.length !== complaintIds.length) throw { code: "forbidden" };
        const note = await prisma.actionNote.create({
          data: { companyId, body: body.body },
        });
        for (const cid of complaintIds) {
          await prisma.actionNoteComplaint.create({ data: { noteId: note.id, complaintId: cid } });
        }
        break;
      }

      // 対策バッジの取り消し(履歴として公開が残る)
      case "retract_action_note": {
        await requireLight();
        const note = await prisma.actionNote.findUnique({ where: { id: body.noteId } });
        if (!note || note.companyId !== companyId) throw { code: "forbidden" };
        await prisma.actionNote.update({
          where: { id: note.id },
          data: { status: "retracted", retractedAt: new Date() },
        });
        break;
      }

      // 「参考になった」マーク(§5.8): 1投稿1回・1企業1日10件・staff対象外
      case "helpful": {
        await requireLight();
        const c = await prisma.complaint.findUnique({
          where: { id: body.complaintId },
          include: { user: true, company: true },
        });
        if (!c || c.companyId !== companyId) throw { code: "forbidden" };
        if (c.lane === "staff") {
          throw { code: "not_applicable", message: "非公開の申し出には付けられません。" };
        }
        const todayCount = await prisma.helpfulMark.count({
          where: { companyId, createdAt: { gte: startOfToday() }, retractedAt: null },
        });
        if (!canAddHelpfulToday(todayCount)) {
          throw { code: "daily_limit", message: "「参考になった」は1日10件までです。" };
        }
        const existing = await prisma.helpfulMark.findUnique({ where: { complaintId: c.id } });
        if (existing && !existing.retractedAt) {
          throw { code: "already", message: "この投稿には付与済みです。" };
        }
        if (existing) {
          await prisma.helpfulMark.update({
            where: { id: existing.id },
            data: { retractedAt: null, createdAt: new Date() },
          });
        } else {
          await prisma.helpfulMark.create({ data: { companyId, complaintId: c.id } });
        }
        await mailService.send({
          to: c.user.email,
          subject: `【クレソル】あなたの指摘が ${c.company.name} に参考にされました`,
          body: `あなたの投稿「${c.title}」について、${c.company.name} が「この指摘は改善の参考になりました」と表明しました。`,
          purpose: "helpful_notify",
        });
        break;
      }

      case "helpful_retract": {
        await requireLight();
        const mark = await prisma.helpfulMark.findUnique({ where: { complaintId: body.complaintId } });
        if (!mark || mark.companyId !== companyId) throw { code: "forbidden" };
        await prisma.helpfulMark.update({
          where: { id: mark.id },
          data: { retractedAt: new Date() },
        });
        break;
      }

      // 解決の申し出(§5.7-(3)): 1投稿1回・80字以上・連絡先は非開示
      case "offer": {
        await requireLight();
        if (!validOfferBody(body.body ?? "")) {
          throw { code: "body_length", message: "申し出の内容は80字以上で記載してください。" };
        }
        ngCheck(body.body);
        const c = await prisma.complaint.findUnique({
          where: { id: body.complaintId },
          include: { user: true, company: true },
        });
        if (!c || c.companyId !== companyId) throw { code: "forbidden" };
        if (c.lane !== "past") {
          throw { code: "not_applicable", message: "解決の申し出は過去投稿(past)にのみ送れます。" };
        }
        const existing = await prisma.resolutionOffer.findUnique({ where: { complaintId: c.id } });
        if (existing) {
          throw { code: "already", message: "この投稿にはすでに申し出済みです(1投稿につき1回)。" };
        }
        await prisma.resolutionOffer.create({
          data: { companyId, complaintId: c.id, body: body.body },
        });
        // 投稿者へマジックリンクで届ける(連絡先は企業に開示しない)
        const token = randomBytes(18).toString("base64url");
        await prisma.magicToken.create({
          data: {
            userId: c.userId,
            complaintId: c.id,
            token,
            expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          },
        });
        const base = process.env.APP_URL || "http://localhost:3000";
        await mailService.send({
          to: c.user.email,
          subject: `【クレソル】${c.company.name} から解決の申し出が届いています`,
          body: `あなたの投稿「${c.title}」について、${c.company.name} から解決の申し出が届きました。応じるかどうかはあなたの自由です(応じなくても不利益はありません)。\n専用ページ: ${base}/m/${token}`,
          purpose: "resolution_offer",
        });
        break;
      }

      // 解決済みバッジは投稿者専用(§5.7-(2))。企業からの作成はAPIレベルで拒否する。
      case "resolution_badge": {
        return NextResponse.json(
          {
            ok: false,
            code: "poster_only",
            message: "解決済みバッジを付けられるのは投稿者本人のみです。企業は作成・編集・削除できません。",
          },
          { status: 403 }
        );
      }

      case "thread_reply": {
        await requireLight();
        ngCheck(body.body);
        const c = await prisma.complaint.findUnique({ where: { id: body.complaintId } });
        if (!c || c.companyId !== companyId || c.lane !== "live") throw { code: "forbidden" };
        await prisma.threadMessage.create({
          data: { complaintId: c.id, senderType: "company", body: body.body },
        });
        if (!c.firstReplyAt) {
          await prisma.complaint.update({
            where: { id: c.id },
            data: { firstReplyAt: new Date(), status: "replied" },
          });
        }
        break;
      }

      case "objection": {
        const c = await prisma.complaint.findUnique({
          where: { id: body.complaintId },
          include: { user: true },
        });
        if (!c || c.companyId !== companyId) throw { code: "forbidden" };
        const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.objection.create({
          data: { complaintId: c.id, reason: body.reason, status: "awaiting_user", userReplyDeadline: deadline },
        });
        await mailService.send({
          to: c.user.email,
          subject: "【クレソル】あなたの投稿に企業が異議を申し立てました",
          body: `7日以内(${deadline.toLocaleDateString("ja-JP")}まで)に維持/修正/非表示をご判断ください。無応答の場合は自動で非表示になります。`,
          purpose: "objection_notice",
        });
        break;
      }

      case "subscribe_plan": {
        const card = await paymentService.registerCard(`company:${companyId}`);
        const trialEndsAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
        await prisma.subscription.upsert({
          where: { companyId },
          update: { status: "trial", trialEndsAt, cardRegistered: card.cardRegistered, planKey: "light" },
          create: { companyId, planKey: "light", status: "trial", trialEndsAt, cardRegistered: card.cardRegistered },
        });
        break;
      }
      case "cancel_plan": {
        await prisma.subscription.updateMany({ where: { companyId }, data: { status: "canceled" } });
        break;
      }
      default:
        return NextResponse.json({ ok: false, code: "unknown" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: e.code ?? "error", message: e.message ?? "" }, { status: 400 });
  }
}
