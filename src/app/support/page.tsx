import Link from "next/link";

export const metadata = { title: "サポート | クレームソルブ" };

export default function SupportPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed text-slate-700">
      <h1 className="text-xl font-bold text-slate-900">サポート</h1>

      <section className="card space-y-2">
        <h2 className="text-base font-bold text-slate-900">まず公的窓口へ</h2>
        <p>
          進行中のトラブルでお困りのときは、消費者ホットライン{" "}
          <strong className="text-base">188</strong>(いやや)へ。
          最寄りの消費生活センターにつながります。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">よくあるご案内</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/guide" className="text-brand-700 hover:underline">
              レビューガイドライン・記事
            </Link>
            <span className="text-xs text-slate-500"> — 投稿のルールと書き方</span>
          </li>
          <li>
            <Link href="/request" className="text-brand-700 hover:underline">
              削除・開示請求
            </Link>
            <span className="text-xs text-slate-500"> — 掲載内容に関するお申し出</span>
          </li>
          <li>
            <Link href="/business" className="text-brand-700 hover:underline">
              企業の皆様へ
            </Link>
            <span className="text-xs text-slate-500"> — 企業ポータル・対応窓口</span>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">お問い合わせ</h2>
        <p className="rounded bg-amber-50 p-3 text-xs text-amber-700">
          ※お問い合わせ窓口は準備中です。公開時にメールフォームを設置します。
        </p>
      </section>
    </article>
  );
}
