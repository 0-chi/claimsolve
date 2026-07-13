import { prisma } from "@/lib/prisma";
import { getCompanyScore } from "@/lib/company-score";
import { REVIEW_COMPLAINT_OR } from "@/lib/queries";
import type { ScoreResult } from "@/lib/scoring";

export interface CompanyCardData {
  id: string;
  name: string;
  corporateNumber: string;
  slug: string;
  category: string;
  score: ScoreResult;
  frozen: boolean;
}

export async function getCompaniesWithScores(): Promise<CompanyCardData[]> {
  const companies = await prisma.company.findMany();
  const cards: CompanyCardData[] = [];
  for (const c of companies) {
    const s = await getCompanyScore(c.id);
    cards.push({
      id: c.id,
      name: c.name,
      corporateNumber: c.corporateNumber,
      slug: c.slug,
      category: c.category,
      score: s.recent,
      frozen: s.frozen,
    });
  }
  return cards;
}

export async function getLatestReviews(take = 6) {
  return prisma.review.findMany({
    where: { complaint: { OR: REVIEW_COMPLAINT_OR } },
    include: { company: true, complaint: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function searchCompanies(q: string) {
  if (!q.trim()) return [];
  return prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { corporateNumber: { contains: q } },
      ],
    },
    take: 20,
  });
}
