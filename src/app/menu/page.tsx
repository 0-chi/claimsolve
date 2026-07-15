import Link from "next/link";

export const metadata = { title: "サービスメニュー | クレームソルブ" };

const ITEMS: { href: string; title: string; desc: string }[] = [
  { href: "/post", title: "投稿する", desc: "レビュー・沈黙レポート・担当者への申し出" },
  { href: "/search", title: "企業を探す", desc: "企業名・法人番号でクレーム対応の評判を検索" },
  { href: "/guide", title: "ガイド・記事", desc: "困ったときの相談の進め方・読みもの" },
  { href: "/login", title: "ログイン", desc: "投稿したレビューの管理" },
  { href: "/business", title: "企業の皆様へ", desc: "企業ポータル・対応窓口のご案内" },
  { href: "/support", title: "サポート", desc: "お問い合わせ・削除／開示請求・公的窓口" },
];

export default function MenuPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">サービスメニュー</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card block transition hover:border-brand-500"
          >
            <div className="font-semibold text-brand-700">{item.title}</div>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
