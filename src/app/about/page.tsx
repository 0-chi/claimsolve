import Link from "next/link";

export const metadata = { title: "クレームソルブについて | クレームソルブ" };

export default function AboutPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed text-slate-700">
      <h1 className="text-xl font-bold text-slate-900">クレームソルブについて</h1>

      <section className="space-y-2">
        <p>
          クレームソルブは、企業の「クレーム対応」を評価するレビューサイトです。
          カスタマーサポートの評判を、投稿と実データで可視化します。
        </p>
        <p>
          誰にも言えないまま終わったトラブルを、次に同じ目にあうはずだった誰かへの「申し送り」に変える——
          それがこのサービスの目的です。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">3つの記録のかたち</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>終わったトラブルの対応をふりかえる「レビュー」</li>
          <li>言わずに終わった不満を残す「沈黙レポート」</li>
          <li>特定の担当者の対応を企業にだけ届ける「担当者への申し出」(完全非公開)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-slate-900">まず公的窓口へ</h2>
        <p>
          進行中のトラブルは、まず消費者ホットライン <strong>188</strong>
          (最寄りの消費生活センターにつながります)へご相談ください。
          専門相談員によるあっせん(企業への介入)は、公的窓口だけができる対応です。
          クレームソルブが引き受けるのは、その「記録」です。
        </p>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Link href="/post" className="btn-primary inline-flex text-sm">まずは1件、書く</Link>
        <Link href="/guide" className="btn-outline inline-flex text-sm">ガイドを読む</Link>
      </div>
    </article>
  );
}
