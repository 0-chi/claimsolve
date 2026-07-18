import Link from "next/link";
import { companyPath } from "@/lib/company-url";
import { categoryLabel } from "@/lib/labels";
import { ScoreBadgePill, ScoreNumber } from "@/components/ScoreBadge";
import type { CompanyCardData } from "@/lib/home";

export function CompanyCard({ c }: { c: CompanyCardData }) {
  return (
    <Link href={companyPath(c)} className="card block hover:border-brand-500 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="chip bg-slate-100 text-slate-600">{categoryLabel(c.category)}</div>
          <h3 className="mt-1 truncate font-semibold text-slate-900">{c.name}</h3>
          <p className="mt-0.5 text-xs text-slate-400">レビュー {c.score.reviewCount}件</p>
        </div>
        <div className="shrink-0 text-right">
          {c.frozen ? (
            <span className="chip bg-slate-200 text-slate-600">審査中</span>
          ) : (
            <>
              <ScoreNumber ar={c.score.ar} aggregating={c.score.aggregating} />
              {c.score.badge && (
                <div className="mt-1">
                  <ScoreBadgePill badge={c.score.badge} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
