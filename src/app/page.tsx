import Link from "next/link";
import { getCompaniesWithScores, getLatestReviews } from "@/lib/home";
import { CompanyCard } from "@/components/CompanyCard";
import { maybeAutoActivateGate, getAllFlags } from "@/lib/flags";
import { companyPath } from "@/lib/company-url";
import { categoryLabel, yearMonthLabel, CATEGORY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await maybeAutoActivateGate();
  const flags = await getAllFlags();
  const cards = await getCompaniesWithScores();
  const latest = await getLatestReviews(6);

  const scored = cards.filter((c) => c.score.ar != null && !c.frozen);
  const topScored = [...scored].sort((a, b) => (b.score.ar ?? 0) - (a.score.ar ?? 0)).slice(0, 4);
  const needsImprovement = [...scored]
    .sort((a, b) => (a.score.ar ?? 0) - (b.score.ar ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* ============ LP上段(v1.5 §3)。gate ON後は検索を主役に(§9) ============ */}
      {!flags.gate_enabled ? (
        <>
          {/* 3.1 ヒーロー */}
          <section className="space-y-4 pt-4 text-center">
            <h1 className="text-2xl font-bold leading-snug text-slate-900">
              その&quot;泣き寝入り&quot;、供養しませんか。
            </h1>
            <p className="mx-auto max-w-md text-sm text-slate-500">
              誰にも言えないまま終わった、あの一件。次に同じ目にあう誰かへの「申し送り」に変える場所をつくりました。
            </p>
            <div className="mx-auto flex max-w-sm flex-col gap-2">
              <Link href="/post" className="btn-primary w-full">まずは1件、書く</Link>
              <Link href="/post?lane=silent" className="btn-outline w-full">
                言わずに終わったことを記録する
              </Link>
            </div>
          </section>

          {/* 3.2 事実 */}
          <section className="mx-auto max-w-md space-y-1 text-center">
            <p className="text-sm text-slate-700">
              消費生活相談は年間およそ<strong className="text-xl">91万件</strong>
              <span className="ml-1 text-xs text-slate-400">
                (出典: 国民生活センター PIO-NET・2023年度)
                {/* 公開前に最新の公表値と年度を必ず確認すること(v1.5 §3.2) */}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              これは&quot;相談まで行った人&quot;の数。言えずに終わった人は、ここに入っていません。
            </p>
          </section>

          {/* 3.3 中核コピー(一字一句このまま・v1.5) */}
          <section className="card mx-auto max-w-xl space-y-3 text-sm leading-relaxed text-slate-700">
            <p className="font-bold text-slate-900">
              あなたの相談は、国のデータベースに記録されます。ただし、それを読み返す仕組みはありません。
            </p>
            <p>
              消費生活センターに寄せられる相談は、年間およそ91万件。すべてPIO-NETという行政のデータベースに記録されています。でも、次に同じ会社と取引しようとしている人が、その中身を読むことはできません。企業名も、原則として公表されません。
            </p>
            <p>
              クレソルは、そこを引き受けます。あなたが書いた5分が、次に同じ目にあうはずだった誰かを守ります。
            </p>
          </section>

          {/* 3.4 対比表(1行目=あっせん。順序変更禁止) */}
          <section className="mx-auto max-w-xl space-y-2">
            <h2 className="text-center text-base font-bold">消費生活センターとクレソル</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left font-medium"></th>
                    <th className="py-2 px-2 font-medium">消費生活センター</th>
                    <th className="py-2 px-2 font-medium text-brand-700">クレソル</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <Row label="専門相談員によるあっせん(企業への介入)" a="○" b="✕" strongA />
                  <Row label="記録の保管" a="○(PIO-NET)" b="○" />
                  <Row label="自分で読み返せる" a="✕" b="○" />
                  <Row label="次に困る人が読める" a="✕" b="○" />
                  <Row label="企業名が公表される" a="✕(原則)" b="○" />
                  <Row label="企業の対応がスコアになる" a="✕" b="○" />
                  <Row label="言わずに終わった不満も記録できる" a="✕" b="○" strongB />
                </tbody>
              </table>
            </div>
          </section>

          {/* 3.5 言わなかった人へ(対比表の直後・silent導線) */}
          <section className="card mx-auto max-w-xl space-y-3 border-amber-200 bg-amber-50/50">
            <h2 className="text-base font-bold text-slate-900">言わなかった人にも、書く場所を。</h2>
            <p className="text-sm text-slate-700">
              文句を言うほどでもなかった。でも、もう二度と使いたくない。
              <br />——いちばん多いのに、いちばん残っていないのが、この記録です。
            </p>
            <p className="text-sm text-slate-700">
              クレソルは「<strong>なぜ、言わなかったのか</strong>」を聞きます。企業を告発するためではありません。
              「連絡先が分からなかった」「繋がらなかった」という理由が集まると、
              <strong>窓口の届きにくさが数字で見えてくる</strong>からです。
            </p>
            <div className="flex flex-wrap gap-1">
              {["連絡先が分からなかった", "言っても無駄だと思った", "揉めるのが怖かった"].map((t) => (
                <span key={t} className="chip bg-white text-slate-600 ring-1 ring-slate-200">{t}</span>
              ))}
              <span className="chip bg-white text-slate-400 ring-1 ring-slate-200">…</span>
            </div>
            <p className="text-sm text-slate-700">
              選ぶだけ、50字から。<strong>3日間、他の人の記録が読み放題になります。</strong>
            </p>
            <Link href="/post?lane=silent" className="btn-primary w-full">
              言わずに終わったことを記録する
            </Link>
          </section>

          {/* 3.6 書き方は4つ */}
          <section className="mx-auto max-w-xl space-y-2">
            <h2 className="text-center text-base font-bold">書き方は4つ</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-left font-medium"></th>
                    <th className="py-2 px-1 text-left font-medium">何を書く</th>
                    <th className="py-2 px-1 text-left font-medium">必要なもの</th>
                    <th className="py-2 px-1 text-left font-medium">もらえるもの</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-semibold">レビュー</td>
                    <td className="px-1">終わったトラブルの対応</td>
                    <td className="px-1">3問+50字(閲覧権は100字〜)</td>
                    <td className="px-1">閲覧権1ヶ月</td>
                  </tr>
                  {flags.live_enabled && (
                    <tr className="border-b border-slate-100">
                      <td className="py-2 font-semibold">記録</td>
                      <td className="px-1">進行中のトラブル</td>
                      <td className="px-1">経緯+企業選択 ※運営の確認のうえ公開・通知</td>
                      <td className="px-1">企業へ通知+後日評価</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                    <td className="py-2 font-semibold">沈黙レポート</td>
                    <td className="px-1">言わずに終わった不満</td>
                    <td className="px-1">理由を選ぶ(最大2)+50字</td>
                    <td className="px-1">閲覧権3日</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">担当者への申し出</td>
                    <td className="px-1">担当者の対応(非公開・企業にだけ届く)</td>
                    <td className="px-1">部署・日時・チャネル+80字</td>
                    <td className="px-1">閲覧権24時間</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400">
              ※担当者への申し出は、どこにも公開されません。個人名はそもそも書けない設計です(日時と部署で企業側が確認します)。
            </p>
          </section>

          {/* 3.7 早期特典(gate OFFのみ・対象はreview由来のみ) */}
          <section className="card mx-auto max-w-xl border-brand-300 bg-brand-50/50 text-center">
            <h2 className="text-base font-bold text-slate-900">いまなら、誰でも全部読めます。</h2>
            <p className="mt-2 text-sm text-slate-600">
              公開された投稿が200件を超えた時点で、全文閲覧は会員限定に切り替わります。
              いま<strong>本文100字以上のレビュー</strong>を書いておけば、切り替わった日から
              <strong>1ヶ月ぶん</strong>の閲覧権があなたに残ります。
            </p>
          </section>

          {/* 3.8 安全性 */}
          <section className="mx-auto max-w-xl">
            <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <li className="rounded-lg bg-slate-50 p-3">実名は不要。ニックネームで投稿できます</li>
              <li className="rounded-lg bg-slate-50 p-3">個人名・電話番号などは投稿前に自動ブロック</li>
              <li className="rounded-lg bg-slate-50 p-3">企業から異議が出ても、維持・修正・非表示を決めるのは投稿者本人</li>
            </ul>
          </section>

          {/* 3.9 CTA + 188 */}
          <section className="mx-auto max-w-sm space-y-2 text-center">
            <Link href="/post" className="btn-primary w-full">まずは1件、書く</Link>
            <Link href="/post?lane=silent" className="btn-outline w-full">言わずに終わったことを記録する</Link>
            <p className="pt-2 text-xs text-slate-500">
              まず公的窓口へ。その記録を、ここに。
              <br />
              消費者ホットライン <strong className="text-base">188</strong>(最寄りの消費生活センターにつながります)
            </p>
          </section>
        </>
      ) : (
        /* gate ON: 検索を主役に(v1.5 §9) */
        <section className="space-y-3 pt-2 text-center">
          <h1 className="text-2xl font-bold text-slate-900">企業の「クレーム対応」を評価する</h1>
          <p className="text-sm text-slate-500">
            カスタマーサポートのOpenWork。対応の評判を、投稿と実データで。
          </p>
        </section>
      )}

      {/* ============ 検索 + 一覧(常時) ============ */}
      <section className="space-y-3">
        <form action="/search" method="get" className="mx-auto flex max-w-md gap-2">
          <input name="q" placeholder="企業名・法人番号で検索" className="input !mt-0 flex-1" />
          <button className="btn-primary shrink-0">検索</button>
        </form>
        <div className="flex flex-wrap justify-center gap-2">
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

      <Section title="スコア上位" href="/search">
        <div className="grid gap-3 sm:grid-cols-2">
          {topScored.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      </Section>

      <Section title="改善余地のある対応">
        <div className="grid gap-3 sm:grid-cols-2">
          {needsImprovement.map((c) => (
            <CompanyCard key={c.id} c={c} />
          ))}
        </div>
      </Section>

      <Section title="新着レビュー">
        <ul className="space-y-2">
          {latest.map((r) => (
            <li key={r.id}>
              <Link href={`/review/${r.id}`} className="card block hover:border-brand-500">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{categoryLabel(r.complaint.category)}</span>
                  <span>{yearMonthLabel(r.complaint.occurredYearMonth) || "進行中案件"}</span>
                </div>
                <span className="mt-1 block text-sm font-semibold text-brand-700">
                  {r.company.name}
                </span>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.complaint.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Row({
  label,
  a,
  b,
  strongA,
  strongB,
}: {
  label: string;
  a: string;
  b: string;
  strongA?: boolean;
  strongB?: boolean;
}) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-2">{label}</td>
      <td className={`px-2 text-center ${strongA ? "font-bold" : ""}`}>{a}</td>
      <td className={`px-2 text-center ${strongB ? "font-bold text-brand-700" : ""}`}>{b}</td>
    </tr>
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
