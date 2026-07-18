import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "企業の方へ | クレームソルブ",
  description:
    "貴社宛のレビュー・報告は無料で全文読めます。レビューは削除できません。スコアは売っていません。変えられるのは、これからの対応だけです。",
};

// 企業LP(v1.5 §4)。危機着地ページとして設計。売り込みから入らない。
export default async function BusinessPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const light = await prisma.plan.findUnique({ where: { key: "light" } });
  const price = light?.priceMonthly ?? 1980;
  // A-1: 「届いています」は通知メール経由(?from=notice)のときだけ
  const fromNotice = searchParams.from === "notice";

  return (
    <div className="space-y-10 text-sm text-slate-700">
      {/* 4.1 ファーストビュー(価格・プラン名は出さない) */}
      <section className="space-y-3 pt-4 text-center">
        <h1 className="text-2xl font-bold leading-snug text-slate-900">
          {fromNotice
            ? "貴社への報告が届いています。まず、無料で読めます。"
            : "貴社への報告が届いたら、まず無料で読めます。"}
        </h1>
        <Link href="/company-portal/register" className="btn-primary inline-flex">
          無料で自社ページを見る
        </Link>
      </section>

      {/* 4.2 正直な前提3つ(この事業の防衛線) */}
      <section className="mx-auto max-w-xl space-y-2">
        <ol className="space-y-2">
          <li className="card border-slate-300">
            <strong>1. レビューは削除できません。</strong> 金銭を含む、いかなる手段でも。
          </li>
          <li className="card border-slate-300">
            <strong>2. スコアは売っていません。</strong> 課金してもスコアは1点も動きません。
          </li>
          <li className="card border-slate-300">
            <strong>3. 変えられるのは、これからの対応だけです。</strong>
          </li>
        </ol>
      </section>

      {/* 4.3 言われていない不満(最大の営業フック) */}
      <section className="card mx-auto max-w-xl space-y-3 border-amber-300 bg-amber-50/60">
        <h2 className="text-lg font-bold text-slate-900">
          貴社には、「言われていない不満」があります。
        </h2>
        <p>
          クレームソルブには、<strong>企業に一度も連絡しないまま終わった人</strong>の記録が集まります。
          その人たちが挙げた理由のうち、どれだけが「<strong>連絡先が分からなかった</strong>」
          「<strong>電話やフォームが繋がらなかった</strong>」「<strong>問い合わせたが返事が来なかった</strong>」
          だったか——貴社のダッシュボードで確認できます。
        </p>
        <p className="text-base font-bold text-slate-900">クレームは、届いていないだけかもしれません。</p>
        <p className="text-xs text-slate-500">
          指標: <strong>沈黙率(SR)</strong> / <strong>窓口不達率(UR)</strong>。
          これらはスコア(AR)には一切影響しません。評価ではなく、気づきのためのデータです。
        </p>
      </section>

      {/* 4.3.1 担当者への申し出 */}
      <section className="mx-auto max-w-xl space-y-2">
        <h2 className="text-base font-bold text-slate-900">公開の場に出る前の声が、届きます。</h2>
        <p>
          消費者は、特定の担当者の対応について<strong>完全非公開</strong>の申し出を送れます。
          公開ページには一切出ません。
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li><strong>無料でも、「届いたこと」と「件数」は通知されます</strong></li>
          <li>本文と、部署別・チャネル別・問題種別の分析は、ライトプランで読めます</li>
          <li><strong>個人名は書けない設計</strong>です(日時・部署・接触チャネルのみが届く)</li>
          <li>目的は現場の傾向把握です(人事評価・処分の道具にはしない旨を規約に明記)</li>
        </ul>
      </section>

      {/* 4.4 対策・解決済みバッジ */}
      <section className="card mx-auto max-w-xl space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          削除はできないが、上書きはできる——「対策・解決済みバッジ」
        </h2>
        <p>
          レビューは消せません。ですが、その下に「この指摘を受けて、こう対策しました」と書くことはできます。
          消せないからこそ、そこに書かれた対策は信じてもらえます。
          <strong>削除できないことが、この機能の価値の源泉です。</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li><strong>対策パート(企業が書く)</strong>: 特定の投稿に紐付けて80字以上で報告。「対策しました」だけの空の申告はできません</li>
          <li><strong>解決済みパート(投稿者が付ける)</strong>: 企業は付けられません。投稿者が「対応があった」と認めた場合にのみ付きます</li>
          <li><strong>両方が揃ったときだけ「対策・解決済み」の完全バッジ</strong>。これは金銭では買えません</li>
          <li>表示には「企業からの自己申告です。クレームソルブが内容を検証したものではありません」を常設</li>
          <li><strong>対策報告率(CR)</strong>を企業ページに常時公開(件数ではなく率。分母は消費者が決めるため水増しできません)。取り消した対策報告も履歴として公開されます</li>
        </ul>
      </section>

      {/* 4.4.1 改善ワークフロー */}
      <section className="mx-auto max-w-xl space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          指摘を、改善に変える一本のワークフロー
        </h2>
        <ol className="space-y-2 text-sm">
          <li className="rounded-lg bg-slate-50 p-3">① <strong>読む</strong>(無料でできます)</li>
          <li className="rounded-lg bg-slate-50 p-3">② <strong>受け止める</strong> — 公開返信 /「参考になった」マーク(投稿者に通知が届きます)</li>
          <li className="rounded-lg bg-slate-50 p-3">③ <strong>直したと報告する</strong> — 対策バッジ(80字以上・投稿に紐付け・公開)</li>
          <li className="rounded-lg bg-slate-50 p-3">④ <strong>その人に届ける</strong> — 解決の申し出(匿名のまま、1回だけ)</li>
          <li className="rounded-lg bg-slate-50 p-3">⑤ <strong>解決済み</strong> — 確定するのは、投稿者本人</li>
        </ol>
        <p className="text-xs text-slate-500">
          どの段階でも、企業が「相手の状態」を宣言することはありません。企業が語るのは常に自分の行動だけ——
          だからこのワークフローには、嘘が入る余地がありません。
        </p>
      </section>

      {/* 4.5 無料 vs ライトプラン(常時表示・A-3) */}
      <section className="mx-auto max-w-xl space-y-3">
        <h2 className="text-base font-bold text-slate-900">無料 と ライトプラン(月額{price.toLocaleString()}円)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 text-left font-medium"></th>
                <th className="px-2 py-2 font-medium">無料</th>
                <th className="px-2 py-2 font-medium text-brand-700">ライトプラン</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <PlanRow label="自社宛レビュー・案件・沈黙レポートの全文閲覧" free="○" paid="○" />
              <PlanRow label="ダッシュボード基本表示" free="○" paid="○" />
              <PlanRow label="週次ダイジェスト通知" free="○" paid="○" />
              <PlanRow label="担当者への申し出: 着信通知・件数" free="○" paid="○" />
              <PlanRow label="「言われていない不満」ビュー(SR/URの内訳)" free="✕" paid="○" />
              <PlanRow label="レビューへの公開返信" free="✕" paid="○" />
              <PlanRow label="対策バッジ(80字以上・紐付け必須)" free="✕" paid="○" />
              <PlanRow label="「参考になった」マーク(投稿者へ通知)" free="✕" paid="○" />
              <PlanRow label="解決の申し出(1投稿1回・匿名のまま)" free="✕" paid="○" />
              <PlanRow label="「褒められたポイント」ビュー" free="✕" paid="○" />
              <PlanRow label="担当者への申し出: 本文・部署別分析" free="✕" paid="○" />
              <PlanRow label="スコア内訳・推移・同業ベンチマーク" free="✕" paid="○" />
              <PlanRow label="新着の即時アラート" free="✕" paid="○" />
              <PlanRow label="ライブ案件の非公開スレッド返答" free="✕" paid="○" />
              <PlanRow label="企業ページの認証バッジ" free="✕" paid="○" />
            </tbody>
          </table>
        </div>
        {/* C-5: クレカ必須の明記 */}
        <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-600">
          <strong>31日無料トライアル(クレジットカードの登録が必要です)</strong>
          <br />
          解約は管理画面から2クリック以内で完了します。
        </p>
      </section>

      {/* 4.6 スコアの仕組みを全公開 */}
      <section className="mx-auto max-w-xl space-y-2">
        <h2 className="text-base font-bold text-slate-900">スコアの仕組みは、全部公開しています</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>AR = (IR×2 + MA×10×3 + RS×3 + IN×2) ÷ 100(IR: ライブ返答率 / MA: 納得度 / RS: 解決到達率 / IN: また使う率)</li>
          <li>レビュー5件未満は「集計中」でスコア非表示</li>
          <li>返答率による自動「非推奨」ラベルは存在しません</li>
          <li>通知が届いていない案件はスコアの分母から除外されます</li>
          <li>沈黙レポート(silent)はARに一切算入されません</li>
        </ul>
      </section>

      {/* 4.7 異議申し立て */}
      <section className="mx-auto max-w-xl space-y-2">
        <h2 className="text-base font-bold text-slate-900">事実と異なる投稿への対応</h2>
        <p className="text-xs text-slate-600">
          異議申し立て → 理由入力 → 投稿者へ7日以内の反論依頼 → 判定は投稿者本人(維持/修正/非表示)→
          7日無応答で自動非表示。裁判所の命令・明白な権利侵害の場合は運営が対応します。
          沈黙レポートも異議申し立ての対象です。
        </p>
      </section>

      {/* 4.8 FAQ */}
      <section className="mx-auto max-w-xl space-y-2">
        <h2 className="text-base font-bold text-slate-900">よくある質問</h2>
        <dl className="space-y-2 text-xs">
          <Faq q="炎上しませんか?">
            企業とのやり取り(非公開スレッド)は公開されません。公開されるのは投稿内容と、返答有無などの事実データです。
          </Faq>
          <Faq q="事実無根の投稿が来たら?">
            異議申し立てフローで、投稿者へ7日以内の判断を求められます。無応答なら自動で非表示になります。
          </Faq>
          <Faq q="競合の嫌がらせは?">
            SMS認証・1電話番号1アカウント・不正検知・BAN制度で対策しています。
          </Faq>
          <Faq q="削除できないのに参加する意味は?">
            返信と対策報告で「その後」を示せるのは登録企業だけです。
          </Faq>
          <Faq q="沈黙レポートは反論できないのでは?">
            週次ダイジェストで必ず通知され、異議申し立ての対象です。
          </Faq>
          <Faq q="社員個人への苦情が公開されるのでは?">
            されません。「担当者への申し出」は完全非公開で、個人名はそもそも書けません(届くのは日時・部署・チャネル)。
            用途は傾向把握であり、処罰の道具にしない旨を規約に明記しています。
          </Faq>
          <Faq q="個人情報は?">
            投稿者を特定し得る情報の記載は、企業の返信でも禁止されています。
          </Faq>
        </dl>
        {/* C-8: 削除・開示請求窓口への導線 */}
        <p className="text-xs text-slate-500">
          削除・発信者情報開示のご請求は{" "}
          <Link href="/request" className="text-brand-700 underline">こちらの窓口</Link>{" "}
          から受け付けています。
        </p>
      </section>

      {/* 4.9 CTA */}
      <section className="mx-auto max-w-sm space-y-2 text-center">
        <Link href="/company-portal/register" className="btn-primary w-full">
          無料で自社ページを見る
        </Link>
        <p className="text-xs text-slate-400">
          法人番号と企業ドメインのメールアドレスで認証します(フリーメール不可)
        </p>
      </section>
    </div>
  );
}

function PlanRow({ label, free, paid }: { label: string; free: string; paid: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-2">{label}</td>
      <td className="px-2 text-center">{free}</td>
      <td className="px-2 text-center font-semibold text-brand-700">{paid}</td>
    </tr>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="font-semibold text-slate-800">{q}</dt>
      <dd className="mt-1 text-slate-600">{children}</dd>
    </div>
  );
}
