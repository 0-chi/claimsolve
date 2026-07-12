import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCompanyUser, companyHasLightPlan } from "@/lib/company-session";
import { moderationService } from "@/lib/moderation";
import { paymentService, mailService } from "@/services";

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
      case "improvement": {
        await requireLight();
        ngCheck(body.body);
        const note = await prisma.improvementNote.create({
          data: { companyId, body: body.body },
        });
        for (const rid of body.reviewIds ?? []) {
          const r = await prisma.review.findUnique({ where: { id: rid } });
          if (r && r.companyId === companyId) {
            await prisma.improvementNoteReview.create({ data: { noteId: note.id, reviewId: rid } });
          }
        }
        break;
      }
      case "thread_reply": {
        await requireLight();
        ngCheck(body.body);
        const c = await prisma.complaint.findUnique({ where: { id: body.complaintId } });
        if (!c || c.companyId !== companyId || c.lane !== "live") throw { code: "forbidden" };
        await prisma.threadMessage.create({
          data: { complaintId: c.id, senderType: "company", body: body.body },
        });
        // 初回返答なら firstReplyAt を記録し status を replied に
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
        // 31日無料トライアル・クレカ登録必須
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
