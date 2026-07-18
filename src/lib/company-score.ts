// DB のレビュー/live案件から企業スコアを算出する橋渡し層。
import { prisma } from "@/lib/prisma";
import {
  computeCompanyScore,
  computeSilentStats,
  computeCr,
  within24Months,
  computeIr,
  CR_LOW_SATISFACTION_MAX,
  type ScoreResult,
  type SilentStats,
  type CrStats,
  type Outcome,
  type LiveComplaintInput,
} from "@/lib/scoring";
import { REVIEW_COMPLAINT_OR, publicComplaintWhere } from "@/lib/queries";

export interface CompanyScoreBundle {
  recent: ScoreResult; // 直近24ヶ月
  allTime: ScoreResult; // 全期間
  frozen: boolean;
}

// 企業の集計対象レビューを取得してスコア算出。
export async function getCompanyScore(companyId: string): Promise<CompanyScoreBundle> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const reviews = await prisma.review.findMany({
    where: {
      companyId,
      complaint: { OR: REVIEW_COMPLAINT_OR },
    },
    include: { complaint: true },
  });

  const liveComplaints = await prisma.complaint.findMany({
    where: { companyId, lane: "live" },
    select: { status: true, notifiedAt: true, firstReplyAt: true, evalUnlockedAt: true },
  });

  const toScoreInput = (r: (typeof reviews)[number]) => ({
    satisfaction: r.satisfaction,
    outcome: r.outcome as Outcome,
    wouldUseAgain: r.wouldUseAgain,
  });

  const liveInput: LiveComplaintInput[] = liveComplaints.map((c) => ({
    status: c.status,
    notifiedAt: c.notifiedAt,
    firstReplyAt: c.firstReplyAt,
  }));

  const recentReviews = reviews.filter((r) =>
    within24Months({
      occurredYearMonth: r.complaint.occurredYearMonth,
      evalDate: r.complaint.lane === "live" ? r.publishedAt ?? r.createdAt : null,
    })
  );

  return {
    recent: computeCompanyScore(recentReviews.map(toScoreInput), liveInput),
    allTime: computeCompanyScore(reviews.map(toScoreInput), liveInput),
    frozen: company?.frozen ?? false,
  };
}

// 企業の沈黙指標(SR/UR)。AR とは別枠(§7.2, §7.3)。
export async function getCompanySilentStats(companyId: string): Promise<SilentStats> {
  const total = await prisma.complaint.count({
    where: { companyId, ...publicComplaintWhere },
  });
  const silents = await prisma.complaint.findMany({
    where: { companyId, lane: "silent", status: "published" },
    select: { silenceReasons: true },
  });
  const reasonsList = silents.map((s) =>
    (s.silenceReasons ?? "").split(",").map((r) => r.trim()).filter(Boolean)
  );
  return computeSilentStats(total, reasonsList);
}

// 企業の対策報告率(CR)(§7.4)。常時公開位置に表示。ARには算入しない。
export async function getCompanyCr(companyId: string): Promise<CrStats> {
  const lowReviews = await prisma.review.findMany({
    where: {
      companyId,
      satisfaction: { lte: CR_LOW_SATISFACTION_MAX },
      complaint: { OR: REVIEW_COMPLAINT_OR },
    },
    select: {
      complaint: {
        select: { actionLinks: { select: { note: { select: { status: true } } } } },
      },
    },
  });
  const retractedCount = await prisma.actionNote.count({
    where: { companyId, status: "retracted" },
  });
  return computeCr(
    lowReviews.map((r) => ({
      hasPublishedAction: r.complaint.actionLinks.some((l) => l.note.status === "published"),
    })),
    retractedCount
  );
}

// 企業の返答率(IR)。評価解禁の日数判定に使用。null=計算不能。
export async function getCompanyReplyRate(companyId: string): Promise<number | null> {
  const liveComplaints = await prisma.complaint.findMany({
    where: { companyId, lane: "live" },
    select: { status: true, notifiedAt: true, firstReplyAt: true },
  });
  return computeIr(
    liveComplaints.map((c) => ({
      status: c.status,
      notifiedAt: c.notifiedAt,
      firstReplyAt: c.firstReplyAt,
    }))
  );
}

// 代表レビュー1〜2件: 納得度が全体の中央値に近いものから順に自動選定
// (恣意的抽出をしない。選定アルゴリズムはガイドラインで公開)。
export async function getRepresentativeReviews(companyId: string, take = 2) {
  const reviews = await prisma.review.findMany({
    where: {
      companyId,
      complaint: { OR: REVIEW_COMPLAINT_OR },
    },
    include: { complaint: true, reply: true },
  });
  if (reviews.length === 0) return [];

  const sats = reviews.map((r) => r.satisfaction).sort((a, b) => a - b);
  const mid = Math.floor(sats.length / 2);
  const median =
    sats.length % 2 === 0 ? (sats[mid - 1] + sats[mid]) / 2 : sats[mid];

  return [...reviews]
    .sort(
      (a, b) =>
        Math.abs(a.satisfaction - median) - Math.abs(b.satisfaction - median)
    )
    .slice(0, take);
}
