import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCompanyScore } from "@/lib/company-score";
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
  cards.sort((a, b) => (b.score.ar ?? -1) - (a.score.ar ?? -1));

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
      {cards.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">該当する企業がありません。</p>
      )}
    </div>
  );
}
