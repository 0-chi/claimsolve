import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { parseCompanyParam } from "@/lib/company-url";
import { getCompanyScore, getRepresentativeReviews, getCompanySilentStats, getCompanyCr } from "@/lib/company-score";
import { loadCompanyReviews, loadLiveFacts, loadSilentReports } from "@/lib/company-page";
import { SilentCard } from "@/components/SilentCard";
import { canViewAllReviews } from "@/lib/session";
import { companyHasPublicPage } from "@/lib/company-visibility";
import { getFlag, maybeAutoActivateGate } from "@/lib/flags";
import { ScoreBadgePill, ScoreNumber } from "@/components/ScoreBadge";
import { MetricSummary } from "@/components/MetricSummary";
import { ReviewCard } from "@/components/ReviewCard";
import { GateBlock } from "@/components/GateBlock";
import WatchButton from "@/components/WatchButton";
import { getCurrentUser } from "@/lib/session";
import { categoryLabel, LIVE_STATUS_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

async function getCompany(param: string) {
  const corporateNumber = parseCompanyParam(param);
  return prisma.company.findUnique({ where: { corporateNumber } });
}

export async function generateMetadata({ params }: { params: { param: string } }): Promise<Metadata> {
  const company = await getCompany(params.param);
  if (!company) return { title: "企業が見つかりません | クレソル" };
  const base = process.env.APP_URL || "http://localhost:3000";
  const ogImage = `${base}/api/og/company/${company.corporateNumber}`;
  return {
    title: `${company.name}のクレーム対応 評判・スコア | クレソル`,
    description: `${company.name}のカスタマーサポート・クレーム対応の評判とスコア。`,
    openGraph: { images: [ogImage] },
    twitter: { card: "summary_large_image", images: [ogImage] },
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

  // 公開投稿0件の企業ページは生成しない(薄いページ対策・staffは数えない)v1.5 §1変更6
  if (!(await companyHasPublicPage(company.id))) notFound();

  const period = searchParams.period === "all" ? "all" : "recent";
  const scoreBundle = await getCompanyScore(company.id);
  const score = period === "all" ? scoreBundle.allTime : scoreBundle.recent;
  const reps = await getRepresentativeReviews(company.id, 2);
  const gate = await canViewAllReviews();
  const liveEnabled = await getFlag("live_enabled");
  const silentStats = await getCompanySilentStats(company.id);
  const silentReports = gate.allowed ? await loadSilentReports(company.id) : [];
  const cr = await getCompanyCr(company.id);

  // 対策バッジ付きの投稿は、バッジ本文と投稿本文をセットで常時公開する(§5.2)
  const allForBadges = await loadCompanyReviews(company.id, "all");
  const badgedReviews = allForBadges.filter((r) => (r.actionNotes?.length ?? 0) > 0);

  const allReviews = gate.allowed ? await loadCompanyReviews(company.id, period) : [];
  const repIds = new Set(reps.map((r) => r.id));
  const repReviews = await loadCompanyReviews(company.id, period).then((rs) =>
    rs.filter((r) => repIds.has(r.id))
  );

  const liveFacts = liveEnabled ? await loadLiveFacts(company.id) : [];
  const sub = await prisma.subscription.findUnique({ where: { companyId: company.id } });
  const isLightPlan = sub && (sub.status === "trial" || sub.status === "active");

  const currentUser = await getCurrentUser();
  const watched = currentUser
    ? !!(await prisma.companyWatch.findUnique({
        where: { userId_companyId: { userId: currentUser.id, companyId: company.id } },
      }))
    : false;

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

        {/* 沈黙率(常時公開・ARとは別枠) */}
        {silentStats.sr != null && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            この企業への報告のうち <strong className="text-sm">{silentStats.sr}%</strong> が
            「企業に一度も言わなかった」人からのものです。
          </div>
        )}

        {/* 対策報告率 CR(常時公開・ARとは別枠)(§7.4) */}
        {cr.cr != null ? (
          <div className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
            改善余地のあるレビュー <strong>{cr.lowReviewTotal}件</strong> のうち、
            <strong>{cr.lowReviewWithAction}件</strong> に対策が報告されています(
            <strong className="text-sm">{cr.cr}%</strong>)。
            {cr.retractedCount > 0 && (
              <span className="ml-1 text-slate-500">取り消された対策報告: {cr.retractedCount}件</span>
            )}
          </div>
        ) : (
          cr.retractedCount > 0 && (
            <p className="text-[11px] text-slate-400">取り消された対策報告: {cr.retractedCount}件</p>
          )
        )}
      </section>

      {/* 投稿導線 + ウォッチ */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href={`/post?company=${company.corporateNumber}`} className="btn-primary flex-1">
            この企業をレビューする
          </Link>
          {currentUser && <WatchButton companyId={company.id} initialWatched={watched} />}
        </div>
        <Link
          href={`/post?company=${company.corporateNumber}&lane=silent`}
          className="btn-outline w-full text-sm"
        >
          言わずに終わった不満を記録する
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

      {/* 対策が報告された投稿(常時公開・SSR)。指摘と対策をセットで公開する(§5.2) */}
      {badgedReviews.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold">指摘と企業の対策</h2>
            <p className="text-xs text-slate-400">
              企業が対策を報告した投稿です。元の指摘とセットで常時公開しています(対策報告率 {cr.cr != null ? `${cr.cr}%` : "集計中"})。
            </p>
          </div>
          {badgedReviews.map((r) => (
            <ReviewCard key={r.id} review={r} detail={gate.allowed} />
          ))}
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
            .filter((r) => !repIds.has(r.id) && !badgedReviews.some((b) => b.id === r.id))
            .map((r) => <ReviewCard key={r.id} review={r} detail />)
        ) : (
          <GateBlock companyCorpNumber={company.corporateNumber} />
        )}
      </section>

      {/* 言わずに終わった声(silent・ARとは別枠) */}
      {silentStats.silentCount > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold">言わずに終わった声</h2>
            <p className="text-xs text-slate-400">
              企業に一度も言わなかった不満の記録です。スコア(AR)には算入していません。
            </p>
          </div>
          {gate.allowed ? (
            silentReports.map((r) => <SilentCard key={r.id} report={r} />)
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              沈黙レポート {silentStats.silentCount}件。本文の閲覧には登録が必要です。
            </div>
          )}
        </section>
      )}
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
