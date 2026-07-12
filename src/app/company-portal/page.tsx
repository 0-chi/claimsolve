import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompanyUser, companyHasLightPlan } from "@/lib/company-session";
import { getCompanyScore } from "@/lib/company-score";
import { getCompaniesWithScores } from "@/lib/home";
import { companyPath } from "@/lib/company-url";
import { ScoreNumber, ScoreBadgePill } from "@/components/ScoreBadge";
import { MetricSummary } from "@/components/MetricSummary";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";
import { LIVE_STATUS_LABELS, categoryLabel, yearMonthLabel } from "@/lib/labels";
import {
  PlanActions,
  ReplyForm,
  ImprovementForm,
  ObjectionForm,
  ThreadReplyForm,
} from "@/components/CompanyActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "企業ダッシュボード | クレソル" };

export default async function CompanyDashboard() {
  const cu = await getCurrentCompanyUser();
  if (!cu) redirect("/company-portal/login");
  const company = cu.company;
  const light = await companyHasLightPlan(company.id);
  const sub = await prisma.subscription.findUnique({ where: { companyId: company.id } });
  const scoreBundle = await getCompanyScore(company.id);
  const score = scoreBundle.recent;

  // 同業ベンチマーク(ライトプラン機能)
  const allCards = light ? await getCompaniesWithScores() : [];
  const peers = allCards.filter((c) => c.category === company.category && c.score.ar != null);
  const benchmark =
    peers.length > 0
      ? peers.reduce((s, c) => s + (c.score.ar ?? 0), 0) / peers.length
      : null;

  const reviews = await prisma.review.findMany({
    where: { companyId: company.id },
    include: { complaint: true, reply: true, improvementLinks: true },
    orderBy: { createdAt: "desc" },
  });

  const liveThreads = await prisma.complaint.findMany({
    where: { companyId: company.id, lane: "live" },
    include: { messages: { orderBy: { createdAt: "asc" } }, review: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="text-xs text-slate-400">{cu.email}</p>
        </div>
        <form action="/api/company/logout" method="post">
          <button className="text-xs text-slate-400 hover:underline">ログアウト</button>
        </form>
      </div>

      {/* スコア + プラン */}
      <section className="card space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <Link href={companyPath(company)} className="text-xs text-brand-700 hover:underline">
              公開ページを見る →
            </Link>
          </div>
          <div className="text-right">
            <ScoreNumber ar={score.ar} aggregating={score.aggregating} />
            {score.badge && <div className="mt-1"><ScoreBadgePill badge={score.badge} /></div>}
          </div>
        </div>
        {!score.aggregating && <MetricSummary score={score} />}
        <div className="border-t border-slate-100 pt-3">
          <PlanActions status={sub?.status ?? null} trialEndsAt={sub?.trialEndsAt?.toISOString() ?? null} />
        </div>
        {light && benchmark != null && (
          <p className="text-xs text-slate-500">
            同業種({categoryLabel(company.category)})平均スコア: <strong>{benchmark.toFixed(1)}</strong> / あなた: {score.ar ?? "—"}
          </p>
        )}
      </section>

      {!light && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-slate-600">
          公開返信・改善済みバッジ・同業比較・ライブ返答は<strong>ライトプラン</strong>でご利用いただけます。
        </div>
      )}

      {/* レビュー(自社宛・全文閲覧は無料) */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">自社宛レビュー({reviews.length})</h2>
        {reviews.map((r) => (
          <div key={r.id} className="card space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{yearMonthLabel(r.complaint.occurredYearMonth) || LIVE_STATUS_LABELS[r.complaint.status] || "進行中"}</span>
              <span>納得度 {r.satisfaction}/10 ・ {OUTCOME_LABELS[r.outcome as Outcome]}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{r.complaint.body}</p>
            {r.improvementLinks.length > 0 && (
              <span className="chip bg-brand-100 text-brand-700">改善済みバッジ付与済</span>
            )}
            {light ? (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-2">
                <ReplyForm reviewId={r.id} existing={r.reply?.body} />
                <ImprovementForm reviewId={r.id} />
                <ObjectionForm complaintId={r.complaintId} />
              </div>
            ) : (
              <p className="text-xs text-slate-400">返信・改善報告はライトプランで可能です。</p>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-slate-400">まだレビューはありません。</p>}
      </section>

      {/* ライブ非公開スレッド */}
      {liveThreads.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold">ライブ案件(非公開スレッド)</h2>
          {liveThreads.map((c) => (
            <div key={c.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.title}</span>
                <span className="chip bg-sky-100 text-sky-700">{LIVE_STATUS_LABELS[c.status] ?? c.status}</span>
              </div>
              <div className="space-y-1">
                {c.messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded px-2 py-1 text-xs ${m.senderType === "company" ? "ml-auto bg-brand-100" : "bg-slate-100"}`}>
                    {m.body}
                  </div>
                ))}
              </div>
              {light ? (
                <ThreadReplyForm complaintId={c.id} />
              ) : (
                <p className="text-xs text-slate-400">スレッド返答はライトプランで可能です。</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
