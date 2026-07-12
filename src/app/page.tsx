import Link from "next/link";
import { getCompaniesWithScores, getLatestReviews } from "@/lib/home";
import { CompanyCard } from "@/components/CompanyCard";
import { maybeAutoActivateGate } from "@/lib/flags";
import { companyPath } from "@/lib/company-url";
import { categoryLabel, yearMonthLabel, CATEGORY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await maybeAutoActivateGate();
  const cards = await getCompaniesWithScores();
  const latest = await getLatestReviews(6);

  const scored = cards.filter((c) => c.score.ar != null && !c.frozen);
  const topScored = [...scored].sort((a, b) => (b.score.ar ?? 0) - (a.score.ar ?? 0)).slice(0, 4);
  const needsImprovement = [...scored]
    .sort((a, b) => (a.score.ar ?? 0) - (b.score.ar ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* ヒーロー + 検索 */}
      <section className="space-y-3 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          企業の「クレーム対応」を評価する
        </h1>
        <p className="text-sm text-slate-500">
          カスタマーサポートのOpenWork。困ったときの対応の評判を、投稿と実データで。
        </p>
        <form action="/search" method="get" className="mx-auto flex max-w-md gap-2">
          <input
            name="q"
            placeholder="企業名・法人番号で検索"
            className="input !mt-0 flex-1"
          />
          <button className="btn-primary shrink-0">検索</button>
        </form>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/search?category=${key}`}
              className="chip bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-400"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* スコア上位 */}
      <Section title="スコア上位" href="/search">
        <div className="grid gap-3 sm:grid-cols-2">
          {topScored.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      </Section>

      {/* 改善余地 */}
      <Section title="改善余地のある対応">
        <div className="grid gap-3 sm:grid-cols-2">
          {needsImprovement.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      </Section>

      {/* 新着レビュー */}
      <Section title="新着レビュー">
        <ul className="space-y-2">
          {latest.map((r) => (
            <li key={r.id}>
              <Link
                href={`/review/${r.id}`}
                className="card block hover:border-brand-500"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{categoryLabel(r.complaint.category)}</span>
                  <span>{yearMonthLabel(r.complaint.occurredYearMonth) || "進行中案件"}</span>
                </div>
                <Link href={companyPath(r.company)} className="mt-1 block text-sm font-semibold text-brand-700">
                  {r.company.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.complaint.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-brand-700 hover:underline">
            すべて見る →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
