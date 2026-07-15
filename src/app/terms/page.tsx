export const metadata = { title: "利用規約 | クレームソルブ" };

export default function TermsPage() {
  return (
    <article className="space-y-4 text-sm text-slate-700">
      <h1 className="text-xl font-bold">利用規約</h1>
      {/* ※公開前に弁護士確認 */}
      <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
        ※本文はプレースホルダです。公開前に弁護士の確認を受けてください。
      </p>

      <section className="space-y-2">
        <h2 className="font-bold">第1条(サービス)</h2>
        <p>クレームソルブ(以下「本サービス」)は、企業のクレーム対応に関するレビュー・評価を提供します。</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">第2条(投稿)</h2>
        <p>投稿者は自らの体験に基づき、レビューガイドラインを遵守して投稿するものとします。</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">第3条(コンテンツの非表示に関する留保)</h2>
        <p>
          運営は、<strong>法令違反・裁判所の命令・明白な権利侵害(個人情報の記載等)</strong>の場合に限り、
          対象コンテンツを非表示にすることができます。それ以外の場合、レビューは金銭その他の手段によって
          削除されることはありません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">第4条(禁止事項・BAN)</h2>
        <p>
          なりすまし・個人情報の掲載・脅迫等は即時のアカウント停止(BAN)の対象です。詳細はレビューガイドラインに定めます。
        </p>
      </section>
    </article>
  );
}
