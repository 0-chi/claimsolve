import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ARTICLES, getArticle, type ArticleSection } from "@/content/articles";
import { getFlag } from "@/lib/flags";
import { categoryLabel } from "@/lib/labels";
import { SHOW_VIEWPASS_UI } from "@/lib/ui-flags";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticle(params.slug);
  if (!article) return { title: "記事が見つかりません | クレームソルブ" };
  return {
    title: `${article.title} | クレームソルブ`,
    description: article.description,
  };
}

// CTAブロック(v1.5 §5)。live は live_enabled=ON のときのみ表示し、
// OFF のときは silent が受け皿になる。
function CtaBlock({ kind, liveEnabled }: { kind: ArticleSection["cta"]; liveEnabled: boolean }) {
  if (kind === "live") {
    if (!liveEnabled) kind = "silent";
  }
  if (kind === "live") {
    return (
      <div className="my-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-slate-800">進行中のトラブルを、記録として残す</p>
        <p className="mt-1 text-xs text-slate-500">
          運営の確認のうえ公開され、通知先が分かる企業には通知します。約束できるのは記録と通知までです。
        </p>
        <Link href="/post?lane=live" className="btn-primary mt-2 inline-flex text-sm">
          記録をはじめる
        </Link>
      </div>
    );
  }
  if (kind === "past") {
    return (
      <div className="my-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-slate-800">終わったトラブルを、次の誰かのために</p>
        <p className="mt-1 text-xs text-slate-500">
          評価は3問。{SHOW_VIEWPASS_UI && "本文100字以上で閲覧権1ヶ月がつきます。"}
        </p>
        <Link href="/post" className="btn-primary mt-2 inline-flex text-sm">
          レビューを書く
        </Link>
      </div>
    );
  }
  if (kind === "silent") {
    return (
      <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">まだ企業に言っていないなら、まず記録だけでも</p>
        <p className="mt-1 text-xs text-slate-500">
          「なぜ言わなかったか」を選ぶだけ、50字から。
          {SHOW_VIEWPASS_UI && "3日間の閲覧権がつきます。"}
        </p>
        <Link href="/post?lane=silent" className="btn-outline mt-2 inline-flex text-sm">
          言わずに終わったことを記録する
        </Link>
      </div>
    );
  }
  if (kind === "watch") {
    return (
      <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">気になる企業の新着レビューを見張る</p>
        <p className="mt-1 text-xs text-slate-500">企業ページからウォッチ登録すると、新着レビューをメールでお知らせします。</p>
        <Link href="/search" className="btn-outline mt-2 inline-flex text-sm">
          企業を探す
        </Link>
      </div>
    );
  }
  return null;
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();
  const liveEnabled = await getFlag("live_enabled");

  return (
    <article className="space-y-5">
      <nav className="text-xs text-slate-400">
        <Link href="/" className="hover:underline">トップ</Link> /{" "}
        <Link href="/guide" className="hover:underline">ガイド</Link>
        {article.category !== "common" && <> / {categoryLabel(article.category)}</>}
      </nav>

      <header className="space-y-2">
        <h1 className="text-xl font-bold leading-snug text-slate-900">{article.title}</h1>
        <p className="text-sm text-slate-500">{article.description}</p>
      </header>

      <div className="space-y-5 text-sm leading-relaxed text-slate-700">
        {article.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="mb-2 text-base font-bold text-slate-900">{s.heading}</h2>}
            <p className="whitespace-pre-wrap">{s.body}</p>
            {s.cta && <CtaBlock kind={s.cta} liveEnabled={liveEnabled} />}
          </section>
        ))}
      </div>

      {/* 記事末尾の主CTA */}
      <footer className="space-y-3 border-t border-slate-200 pt-5">
        <CtaBlock kind={article.mainCta} liveEnabled={liveEnabled} />
        <CtaBlock kind="silent" liveEnabled={liveEnabled} />
        <p className="text-xs text-slate-400">
          困りごとの相談は、消費者ホットライン <strong>188</strong>(最寄りの消費生活センター)へ。
          まず公的窓口へ。その記録を、ここに。
        </p>
      </footer>
    </article>
  );
}
