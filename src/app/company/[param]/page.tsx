import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { parseCompanyParam } from "@/lib/company-url";
import { getCompanyScore, getRepresentativeReviews } from "@/lib/company-score";
import { loadCompanyReviews, loadLiveFacts } from "@/lib/company-page";
import { canViewAllReviews } from "@/lib/session";
import { getFlag, maybeAutoActivateGate } from "@/lib/flags";
import { ScoreBadgePill, ScoreNumber } from "@/components/ScoreBadge";
import { MetricSummary } from "@/components/MetricSummary";
import { ReviewCard } from "@/components/ReviewCard";
import { GateBlock } from "@/components/GateBlock";
import { categoryLabel, LIVE_STATUS_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

async function getCompany(param: string) {
  const corporateNumber = parseCompanyParam(param);
  return prisma.company.findUnique({ where: { corporateNumber } });
}

export async function generateMetadata({ params }: { params: { param: string } }): Promise<Metadata> {
  const company = await getCompany(params.param);
  if (!company) return { title: "企業が見つかりません | クレソル" };
  return {
    title: `${company.name}のクレーム対応 評判・スコア | クレソル`,
    description: `${company.name}のカスタマーサポート・クレーム対応の評判とスコア。`,
  };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: { param: string };
  searchParams: { period?: string };
}) {
  await maybeAutoActivateGate();
  const company = await getCompany(params.param);
  if (!company) notFound();

  const period = searchParams.period === "all" ? "all" : "recent";
  const scoreBundle = await getCompanyScore(company.id);
  const score = period === "all" ? scoreBundle.allTime : scoreBundle.recent;
  const reps = await getRepresentativeReviews(company.id, 2);
  const gate = await canViewAllReviews();
  const liveEnabled = await getFlag("live_enabled");

  const allReviews = gate.allowed ? await loadCompanyReviews(company.id, period) : [];
  const repIds = new Set(reps.map((r) => r.id));
  const repReviews = await loadCompanyReviews(company.id, period).then((rs) =>
    rs.filter((r) => repIds.has(r.id))
  );

  const liveFacts = liveEnabled ? await loadLiveFacts(company.id) : [];
  const sub = await prisma.subscription.findUnique({ where: { companyId: company.id } });
  const isLightPlan = sub && (sub.status === "trial" || sub.status === "active");

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/" className="hover:underline">トップ</Link> / {categoryLabel(company.category)}
      </nav>

      {/* ヘッダー(常時公開・SSR) */}
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="chip bg-slate-100 text-slate-600">{categoryLabel(company.category)}</span>
              {company.domainVerified && isLightPlan && (
                <span className="chip bg-brand-100 text-brand-700">認証バッジ</span>
              )}
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{company.name}</h1>
            <p className="text-xs text-slate-400">法人番号 {company.corporateNumber}</p>
          </div>
          <div className="shrink-0 text-right">
            {scoreBundle.frozen ? (
              <span className="chip bg-slate-200 text-slate-600">審査中(スコア凍結)</span>
            ) : (
              <>
                <ScoreNumber ar={score.ar} aggregating={score.aggregating} />
                {score.badge && (
                  <div className="mt-1">
                    <ScoreBadgePill badge={score.badge} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 期間タブ */}
        <div className="flex gap-2 text-xs">
          <TabLink label="直近24ヶ月" active={period === "recent"} href={`?period=recent`} />
          <TabLink label="全期間" active={period === "all"} href={`?period=all`} />
        </div>

        {!score.aggregating && <MetricSummary score={score} />}
        {score.aggregating && (
          <p className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-400">
            レビュー5件未満のため集計中です(現在 {score.reviewCount}件)。
          </p>
        )}
      </section>

      {/* 投稿導線 */}
      <div className="flex gap-2">
        <Link href={`/post?company=${company.corporateNumber}`} className="btn-primary flex-1">
          この企業をレビューする
        </Link>
      </div>

      {/* ライブ事実データ(live_enabled=ON のときのみ) */}
      {liveEnabled && liveFacts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-bold">進行中・ライブ案件</h2>
          <ul className="space-y-2">
            {liveFacts.map((f) => (
              <li key={f.id} className="card text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{f.title}</span>
                  <span className="chip bg-slate-100 text-slate-600">
                    {LIVE_STATUS_LABELS[f.status] ?? f.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  返答: {f.firstReplyAt ? "あり" : "なし"} / 同じトラブル {f.sameCount}件
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 代表レビュー(常時公開・SSR) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">代表レビュー</h2>
          <Link href="/guide#representative" className="text-xs text-brand-700 hover:underline">
            選定方法
          </Link>
        </div>
        {repReviews.length === 0 && <p className="text-sm text-slate-400">まだレビューがありません。</p>}
        {repReviews.map((r) => (
          <ReviewCard key={r.id} review={r} detail={gate.allowed} />
        ))}
      </section>

      {/* 全レビュー(ゲート) */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">
          すべてのレビュー{gate.allowed ? `(${allReviews.length}件)` : ""}
        </h2>
        {gate.allowed ? (
          allReviews
            .filter((r) => !repIds.has(r.id))
            .map((r) => <ReviewCard key={r.id} review={r} detail />)
        ) : (
          <GateBlock companyCorpNumber={company.corporateNumber} />
        )}
      </section>
    </div>
  );
}

function TabLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`chip ${active ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
    >
      {label}
    </Link>
  );
}
