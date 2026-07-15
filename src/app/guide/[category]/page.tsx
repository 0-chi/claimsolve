import Link from "next/link";
import { categoryLabel, CATEGORY_LABELS } from "@/lib/labels";
import { ARTICLES } from "@/content/articles";

export function generateStaticParams() {
  return Object.keys(CATEGORY_LABELS).map((category) => ({ category }));
}

export function generateMetadata({ params }: { params: { category: string } }) {
  return { title: `${categoryLabel(params.category)}のクレーム対応ガイド | クレームソルブ` };
}

// /guide/{category} のガイド記事一覧(v1.5 §5)
export default function CategoryGuidePage({ params }: { params: { category: string } }) {
  const label = categoryLabel(params.category);
  const articles = ARTICLES.filter(
    (a) => a.category === params.category || a.category === "common"
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{label}のクレーム対応ガイド</h1>

      <ul className="space-y-3">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/guide/articles/${a.slug}`} className="card block hover:border-brand-500">
              <h2 className="font-semibold text-slate-900">{a.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.description}</p>
            </Link>
          </li>
        ))}
      </ul>

      <Link href={`/search?category=${params.category}`} className="btn-primary inline-flex">
        {label}の企業スコアを見る
      </Link>
    </div>
  );
}
