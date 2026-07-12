import Link from "next/link";
import { categoryLabel, CATEGORY_LABELS } from "@/lib/labels";

export function generateStaticParams() {
  return Object.keys(CATEGORY_LABELS).map((category) => ({ category }));
}

export function generateMetadata({ params }: { params: { category: string } }) {
  return { title: `${categoryLabel(params.category)}のクレーム対応ガイド | クレソル` };
}

// /guide/{category} のガイド記事置き場(プレースホルダ・SEO用)
export default function CategoryGuidePage({ params }: { params: { category: string } }) {
  const label = categoryLabel(params.category);
  return (
    <article className="space-y-4 text-sm text-slate-700">
      <h1 className="text-xl font-bold">{label}のクレーム対応ガイド</h1>
      <p className="rounded bg-slate-100 p-3 text-slate-500">
        (プレースホルダ)このカテゴリのトラブル事例・対応のコツ・関連企業のスコアをまとめる記事置き場です。
      </p>
      <Link href={`/search?category=${params.category}`} className="btn-primary inline-flex">
        {label}の企業スコアを見る
      </Link>
    </article>
  );
}
