export const metadata = { title: "プライバシーポリシー | クレソル" };

export default function PrivacyPage() {
  return (
    <article className="space-y-4 text-sm text-slate-700">
      <h1 className="text-xl font-bold">プライバシーポリシー</h1>
      <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
        ※本文はプレースホルダです。公開前に弁護士の確認を受けてください。
      </p>
      <section className="space-y-2">
        <h2 className="font-bold">取得する情報</h2>
        <p>ニックネーム・メールアドレス・電話番号(SMS認証)を取得します。実名は収集しません。</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">利用目的</h2>
        <p>本人確認、なりすまし防止、通知、開示請求への対応(IP/User-Agentの保存を含む)に利用します。</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">消去・開示請求</h2>
        <p>個人情報保護法に基づく消去請求・開示請求は所定の窓口で受け付けます。</p>
      </section>
    </article>
  );
}
