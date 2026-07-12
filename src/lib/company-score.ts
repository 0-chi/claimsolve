// DB のレビュー/live案件から企業スコアを算出する橋渡し層。
import { prisma } from "@/lib/prisma";
import {
  computeCompanyScore,
  within24Months,
  computeIr,
  type ScoreResult,
  type Outcome,
  type LiveComplaintInput,
} from "@/lib/scoring";
import { PUBLIC_COMPLAINT_OR } from "@/lib/queries";

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
      complaint: { OR: PUBLIC_COMPLAINT_OR },
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
      complaint: { OR: PUBLIC_COMPLAINT_OR },
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
