import { prisma } from "@/lib/prisma";
import { within24Months } from "@/lib/scoring";
import { PUBLIC_COMPLAINT_OR } from "@/lib/queries";
import type { ReviewCardReview } from "@/components/ReviewCard";

// 表示用にレビューを整形(係争中フラグ・改善済みバッジ・返信を付与)。
export async function loadCompanyReviews(
  companyId: string,
  period: "recent" | "all"
): Promise<ReviewCardReview[]> {
  const reviews = await prisma.review.findMany({
    where: {
      companyId,
      complaint: { OR: PUBLIC_COMPLAINT_OR },
    },
    include: {
      complaint: { include: { objections: true } },
      reply: true,
      user: true,
      improvementLinks: { include: { note: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = reviews.filter((r) =>
    period === "all"
      ? true
      : within24Months({
          occurredYearMonth: r.complaint.occurredYearMonth,
          evalDate: r.complaint.lane === "live" ? r.publishedAt ?? r.createdAt : null,
        })
  );

  return filtered.map((r) => ({
    id: r.id,
    satisfaction: r.satisfaction,
    outcome: r.outcome,
    wouldUseAgain: r.wouldUseAgain,
    firstReplySpeed: r.firstReplySpeed,
    transferCount: r.transferCount,
    agentScore: r.agentScore,
    supervisorScore: r.supervisorScore,
    noEscalation: r.noEscalation,
    externalChannels: r.externalChannels,
    totalDays: r.totalDays,
    comment: r.comment,
    noResponseEval: r.noResponseEval,
    complaint: {
      title: r.complaint.title,
      body: r.complaint.body,
      occurredYearMonth: r.complaint.occurredYearMonth,
      lane: r.complaint.lane,
      status: r.complaint.status,
    },
    reply: r.reply ? { body: r.reply.body } : null,
    user: { kycStatus: r.user.kycStatus },
    disputed: r.complaint.objections.some((o) => o.status === "kept_disputed"),
    improvementNotes: r.improvementLinks.map((l) => ({ id: l.note.id, body: l.note.body })),
  }));
}

// ライブ事実データ(公開情報のみ)。live_enabled=ON のときだけ表示に使う。
export async function loadLiveFacts(companyId: string) {
  const live = await prisma.complaint.findMany({
    where: { companyId, lane: "live", status: { notIn: ["pending_review", "removed"] } },
    select: {
      id: true,
      title: true,
      status: true,
      notifiedAt: true,
      firstReplyAt: true,
      publishedAt: true,
      sameCount: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return live;
}
