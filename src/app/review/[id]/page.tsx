import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadCompanyReviews } from "@/lib/company-page";
import { getRepresentativeReviews } from "@/lib/company-score";
import { canViewAllReviews } from "@/lib/session";
import { companyPath } from "@/lib/company-url";
import { ReviewCard } from "@/components/ReviewCard";
import { GateBlock } from "@/components/GateBlock";
import ReportButton from "@/components/ReportButton";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: { id: string } }) {
  const review = await prisma.review.findUnique({
    where: { id: params.id },
    include: { company: true, complaint: true },
  });
  if (!review) notFound();

  const gate = await canViewAllReviews();
  const reps = await getRepresentativeReviews(review.companyId, 2);
  const isRepresentative = reps.some((r) => r.id === review.id);
  const canSeeDetail = gate.allowed || isRepresentative;

  const enriched = (await loadCompanyReviews(review.companyId, "all")).find(
    (r) => r.id === review.id
  );

  return (
    <div className="space-y-4">
      <nav className="text-xs text-slate-400">
        <Link href="/" className="hover:underline">トップ</Link> /{" "}
        <Link href={companyPath(review.company)} className="hover:underline">
          {review.company.name}
        </Link>
      </nav>

      {canSeeDetail && enriched ? (
        <ReviewCard review={enriched} detail={gate.allowed} />
      ) : (
        <>
          {enriched && <ReviewCard review={{ ...enriched, comment: "" }} detail={false} />}
          <GateBlock companyCorpNumber={review.company.corporateNumber} />
        </>
      )}

      <div className="flex items-center justify-between">
        <Link href={companyPath(review.company)} className="text-sm text-brand-700 hover:underline">
          ← {review.company.name} の全レビュー
        </Link>
        <ReportButton targetType="review" targetId={review.id} />
      </div>
    </div>
  );
}
