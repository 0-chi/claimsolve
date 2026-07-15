import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompanyUser, companyHasLightPlan } from "@/lib/company-session";
import { getCompanyScore, getCompanySilentStats, getCompanyCr } from "@/lib/company-score";
import { companyHasPublicPage } from "@/lib/company-visibility";
import { loadSilentReports } from "@/lib/company-page";
import { getCompaniesWithScores } from "@/lib/home";
import {
  SILENCE_REASON_LABELS,
  STAFF_CHANNEL_LABELS,
  STAFF_ISSUE_LABELS,
  PRAISE_POINT_LABELS,
  type SilenceReason,
  type StaffChannel,
  type StaffIssue,
  type PraisePoint,
} from "@/lib/scoring";
import { companyPath } from "@/lib/company-url";
import { ScoreNumber, ScoreBadgePill } from "@/components/ScoreBadge";
import { MetricSummary } from "@/components/MetricSummary";
import { OUTCOME_LABELS, type Outcome } from "@/lib/scoring";
import { LIVE_STATUS_LABELS, categoryLabel, yearMonthLabel } from "@/lib/labels";
import {
  PlanActions,
  ReplyForm,
  ActionNoteForm,
  HelpfulButton,
  OfferForm,
  RetractNoteButton,
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
    include: {
      complaint: {
        include: {
          actionLinks: { include: { note: true } },
          helpfulMark: true,
          resolutionBadge: true,
          resolutionOffer: true,
        },
      },
      reply: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const liveThreads = await prisma.complaint.findMany({
    where: { companyId: company.id, lane: "live" },
    include: { messages: { orderBy: { createdAt: "asc" } }, review: true },
    orderBy: { createdAt: "desc" },
  });

  // 「言われていない不満」ビュー(§6-6)
  const silentStats = await getCompanySilentStats(company.id);
  const silentReports = await loadSilentReports(company.id);

  // 対策報告率(CR)(§7.4)
  const cr = await getCompanyCr(company.id);

  // 公開投稿0件なら公開ページは存在しない(v1.5 §1変更6)
  const hasPublicPage = await companyHasPublicPage(company.id);

  // 「担当者への申し出」(§5.9)。無料=件数のみ / ライトプラン=本文+分析
  const staffComplaints = await prisma.complaint.findMany({
    where: { companyId: company.id, lane: "staff", status: { notIn: ["removed"] } },
    orderBy: { createdAt: "desc" },
  });
  const staffByDept = new Map<string, number>();
  const staffByChannel = new Map<string, number>();
  const staffByIssue = new Map<string, number>();
  for (const s of staffComplaints) {
    staffByDept.set(s.department ?? "不明", (staffByDept.get(s.department ?? "不明") ?? 0) + 1);
    staffByChannel.set(s.contactChannel ?? "-", (staffByChannel.get(s.contactChannel ?? "-") ?? 0) + 1);
    for (const i of (s.staffIssues ?? "").split(",").filter(Boolean)) {
      staffByIssue.set(i, (staffByIssue.get(i) ?? 0) + 1);
    }
  }

  // 「褒められたポイント」ビュー(§6-7)
  const badges = await prisma.resolutionBadge.findMany({
    where: { complaint: { companyId: company.id } },
  });
  const praiseCount = new Map<string, number>();
  for (const b of badges) {
    for (const p of b.praisePoints.split(",").filter(Boolean)) {
      praiseCount.set(p, (praiseCount.get(p) ?? 0) + 1);
    }
  }

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
            {hasPublicPage ? (
              <Link href={companyPath(company)} className="text-xs text-brand-700 hover:underline">
                公開ページを見る →
              </Link>
            ) : (
              <span className="text-xs text-slate-400">
                公開ページは最初の投稿が届いた時点で作成されます
              </span>
            )}
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
        {light && (
          <p className="text-xs text-slate-500">
            対策報告率(CR):{" "}
            {cr.cr != null ? (
              <>
                改善余地レビュー{cr.lowReviewTotal}件のうち{cr.lowReviewWithAction}件に対策を報告(
                <strong>{cr.cr}%</strong>)
              </>
            ) : (
              "集計中(改善余地レビュー5件未満)"
            )}
            {cr.retractedCount > 0 && ` / 取り消された対策報告: ${cr.retractedCount}件`}
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
            <div className="flex flex-wrap gap-1">
              {r.complaint.actionLinks.some((l) => l.note.status === "published") && (
                <span className="chip bg-brand-100 text-brand-700">対策バッジ付与済</span>
              )}
              {r.complaint.resolutionBadge && (
                <span className="chip bg-emerald-100 text-emerald-800">解決済み(投稿者確定)</span>
              )}
              {r.complaint.helpfulMark && !r.complaint.helpfulMark.retractedAt && (
                <span className="chip bg-brand-50 text-brand-700">参考にした</span>
              )}
            </div>
            {r.complaint.actionLinks
              .filter((l) => l.note.status === "published")
              .map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-2 rounded bg-brand-50 p-2 text-xs text-slate-600">
                  <span className="line-clamp-2">{l.note.body}</span>
                  {light && <RetractNoteButton noteId={l.note.id} />}
                </div>
              ))}
            {light ? (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-2">
                <ReplyForm reviewId={r.id} existing={r.reply?.body} />
                <ActionNoteForm complaintId={r.complaintId} />
                <HelpfulButton
                  complaintId={r.complaintId}
                  active={!!r.complaint.helpfulMark && !r.complaint.helpfulMark.retractedAt}
                />
                {r.complaint.lane === "past" && (
                  <OfferForm complaintId={r.complaintId} offered={!!r.complaint.resolutionOffer} />
                )}
                <ObjectionForm complaintId={r.complaintId} />
              </div>
            ) : (
              <p className="text-xs text-slate-400">返信・対策バッジ・解決の申し出はライトプランで可能です。</p>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-slate-400">まだレビューはありません。</p>}
      </section>

      {/* 「言われていない不満」ビュー(§6-4) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">言われていない不満</h2>
          <p className="text-xs text-slate-400">
            貴社に一度も言われなかった不満(沈黙レポート)です。受け取り損ねている声を可視化します。
          </p>
        </div>

        {light ? (
          <div className="card space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-lg font-bold">{silentStats.silentCount}</div>
                <div className="text-[11px] text-slate-500">沈黙レポート件数</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="text-lg font-bold text-amber-800">
                  {silentStats.sr != null ? `${silentStats.sr}%` : "集計中"}
                </div>
                <div className="text-[11px] text-slate-500">沈黙率(SR)</div>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <div className="text-lg font-bold text-rose-700">
                  {silentStats.ur != null ? `${silentStats.ur}%` : "集計中"}
                </div>
                <div className="text-[11px] text-slate-500">窓口不達率(UR)</div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs">
              <p className="mb-1 font-medium text-slate-600">窓口不達の内訳</p>
              <ul className="space-y-0.5 text-slate-600">
                <li>連絡先が分からなかった: {silentStats.unreachableBreakdown.no_contact_found}件</li>
                <li>電話やフォームが繋がらなかった: {silentStats.unreachableBreakdown.could_not_reach}件</li>
                <li>問い合わせたが返事が来なかった: {silentStats.unreachableBreakdown.no_reply_received}件</li>
              </ul>
            </div>
            {silentStats.ur != null && silentStats.ur > 0 && (
              <p className="text-xs text-rose-600">
                貴社は、不満を受け取り損ねています(窓口不達 {silentStats.ur}%)。
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-slate-600">
            沈黙率(SR)・窓口不達率(UR)とその内訳は<strong>ライトプラン</strong>で表示されます。
          </div>
        )}

        {/* 沈黙レポート全文(無料で閲覧可) */}
        {silentReports.map((s) => (
          <div key={s.id} className="card space-y-1">
            <div className="flex flex-wrap gap-1">
              {s.silenceReasons.map((r) => (
                <span key={r} className="chip bg-slate-100 text-slate-600">
                  {SILENCE_REASON_LABELS[r as SilenceReason] ?? r}
                </span>
              ))}
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{s.body}</p>
            {light && <ObjectionForm complaintId={s.id} />}
          </div>
        ))}
        {silentReports.length === 0 && (
          <p className="text-sm text-slate-400">まだ沈黙レポートはありません。</p>
        )}
      </section>

      {/* 「担当者への申し出」ビュー(§5.9)。無料=件数のみ / ライトプラン=本文+分析 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">担当者への申し出</h2>
          <p className="text-xs text-slate-400">
            完全非公開で届く申し出です。個人の処罰ではなく、傾向把握のためのデータです。
          </p>
        </div>
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">{staffComplaints.length}</div>
            <div className="text-xs text-slate-500">件の申し出が届いています(公開はされません)</div>
          </div>
          {light ? (
            staffComplaints.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="mb-1 font-medium text-slate-600">部署別</p>
                    {[...staffByDept.entries()].map(([k, v]) => (
                      <p key={k} className="text-slate-500">{k}: {v}件</p>
                    ))}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="mb-1 font-medium text-slate-600">チャネル別</p>
                    {[...staffByChannel.entries()].map(([k, v]) => (
                      <p key={k} className="text-slate-500">{STAFF_CHANNEL_LABELS[k as StaffChannel] ?? k}: {v}件</p>
                    ))}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="mb-1 font-medium text-slate-600">問題種別</p>
                    {[...staffByIssue.entries()].map(([k, v]) => (
                      <p key={k} className="text-slate-500">{STAFF_ISSUE_LABELS[k as StaffIssue] ?? k}: {v}件</p>
                    ))}
                    {staffByIssue.size === 0 && <p className="text-slate-400">—</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  {staffComplaints.map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                      <div className="flex flex-wrap gap-1 text-slate-400">
                        <span>{s.department}</span>
                        <span>/ {STAFF_CHANNEL_LABELS[(s.contactChannel ?? "") as StaffChannel] ?? s.contactChannel}</span>
                        <span>/ {s.contactedAt}</span>
                      </div>
                      {s.staffIssues && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.staffIssues.split(",").filter(Boolean).map((i) => (
                            <span key={i} className="chip bg-slate-100 text-slate-600">
                              {STAFF_ISSUE_LABELS[i as StaffIssue] ?? i}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{s.body}</p>
                      <div className="mt-1">
                        <ObjectionForm complaintId={s.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-slate-600">
              本文の閲覧と部署別・チャネル別の傾向分析は<strong>ライトプラン</strong>の機能です。
              件数と着信通知は無料でご確認いただけます。
            </div>
          )}
        </div>
      </section>

      {/* 「褒められたポイント」ビュー(§6-7) */}
      {light && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold">褒められたポイント</h2>
            <p className="text-xs text-slate-400">解決済みバッジで投稿者が選んだ「良かった点」の集計です。</p>
          </div>
          <div className="card">
            {praiseCount.size === 0 ? (
              <p className="text-sm text-slate-400">まだ解決済みバッジの称賛はありません。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...praiseCount.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <span key={k} className="chip bg-emerald-50 text-emerald-700">
                      {PRAISE_POINT_LABELS[k as PraisePoint] ?? k} × {v}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}

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
