import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCompanyScore } from "@/lib/company-score";
import { companyPublicPostCount } from "@/lib/company-visibility";
import { CompanyCard } from "@/components/CompanyCard";
import { CATEGORY_LABELS, categoryLabel } from "@/lib/labels";
import type { CompanyCardData } from "@/lib/home";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category;

  const companies = await prisma.company.findMany({
    where: {
      AND: [
        q ? { OR: [{ name: { contains: q } }, { corporateNumber: { contains: q } }] } : {},
        category ? { category } : {},
      ],
    },
  });

  // 公開投稿が1件以上の企業のみカード表示(0件企業のページは存在しないため)
  const cards: CompanyCardData[] = [];
  const zeroPost: { corporateNumber: string; name: string }[] = [];
  for (const c of companies) {
    if ((await companyPublicPostCount(c.id)) === 0) {
      zeroPost.push({ corporateNumber: c.corporateNumber, name: c.name });
      continue;
    }
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
  cards.sort((a, b) => (b.score.ar ?? -1) - (a.score.ar ?? -1));

  // 法人マスタから未収載(Company未昇格)の候補を探す(v1.5 §6・空状態=最大の投稿機会)
  const masterOnly = q
    ? (
        await prisma.corporateMaster.findMany({
          where: { OR: [{ name: { contains: q } }, { corporateNumber: { contains: q } }] },
          take: 10,
        })
      ).filter((m) => !companies.some((c) => c.corporateNumber === m.corporateNumber))
    : [];

  const noHitAtAll = cards.length === 0 && zeroPost.length === 0 && masterOnly.length === 0;

  return (
    <div className="space-y-5">
      <form action="/search" method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="企業名・法人番号" className="input !mt-0 flex-1" />
        <button className="btn-primary shrink-0">検索</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href="/search" className={`chip ${!category ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
          すべて
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/search?category=${key}`}
            className={`chip ${category === key ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        {category ? `${categoryLabel(category)} / ` : ""}
        {q ? `「${q}」の` : ""}検索結果: {cards.length}件
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <CompanyCard key={c.id} c={c} />
        ))}
      </div>

      {/* 報告がまだない企業(0件企業・法人マスタ)= 最初の1件のCTA */}
      {(zeroPost.length > 0 || masterOnly.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-700">報告がまだない企業</h2>
          {[...zeroPost, ...masterOnly.map((m) => ({ corporateNumber: m.corporateNumber, name: m.name }))].map(
            (c) => (
              <div key={c.corporateNumber} className="card space-y-2">
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.name}の報告はまだありません。最初の1件を書きませんか。
                </p>
                <div className="flex gap-2">
                  <Link href={`/post?company=${c.corporateNumber}`} className="btn-primary flex-1 text-xs">
                    最初のレビューを書く
                  </Link>
                  <Link href={`/post?company=${c.corporateNumber}&lane=silent`} className="btn-outline flex-1 text-xs">
                    言わずに終わった話を記録
                  </Link>
                </div>
              </div>
            )
          )}
        </section>
      )}

      {noHitAtAll && (
        <div className="card space-y-2 py-8 text-center">
          <p className="text-sm text-slate-600">
            {q ? `「${q}」の報告はまだありません。最初の1件を書きませんか。` : "該当する企業がありません。"}
          </p>
          <div className="mx-auto flex max-w-sm gap-2">
            <Link href="/post" className="btn-primary flex-1 text-xs">最初の1件を書く</Link>
            <Link href="/post?lane=silent" className="btn-outline flex-1 text-xs">言わずに終わった話を記録</Link>
          </div>
        </div>
      )}
    </div>
  );
}
