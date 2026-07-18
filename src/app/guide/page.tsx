export const metadata = { title: "レビューガイドライン | クレームソルブ" };

export default function GuidePage() {
  return (
    <article className="prose-sm space-y-6 text-sm text-slate-700">
      <h1 className="text-xl font-bold">レビューガイドライン</h1>

      <section className="space-y-2">
        <h2 className="font-bold">書いてよいこと</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>実際に体験したクレーム対応の経緯と結果</li>
          <li>対応にかかった時間・回数などの事実</li>
          <li>対応内容そのものへの評価・感想</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">NG例(投稿できません)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>従業員・担当者の個人名/電話番号/メールアドレス/住所番地/口座番号/車両ナンバー</li>
          <li>差別語・ヘイト表現、脅迫・危害予告</li>
          <li>外部URL</li>
        </ul>
        <p className="text-slate-500">
          犯罪の断定(「詐欺」等)・人格攻撃・容姿/国籍/性別への言及・根拠のない憶測は警告対象です。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">BAN基準</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>即時BAN</strong>:脅迫・危害予告/個人情報晒し/なりすまし</li>
          <li><strong>3回でBAN</strong>:掲載後に発覚した攻撃的・断定表現などの違反(warn累積)</li>
        </ul>
        <p className="text-slate-500">
          BAN時は当該アカウントの全投稿を非公開化し、同一電話番号での再登録をブロックします。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">沈黙レポート(言わずに終わった声)の位置づけ</h2>
        <p>
          「言わずに終わった不満」は、企業への<strong>告発ではなく、投稿者自身の行動の自己申告</strong>です。
          質問は「企業の落ち度」ではなく「<strong>なぜ自分は言わなかったのか</strong>」を聞きます。
          このレポートは対応スコア(AR)には<strong>一切算入しません</strong>。企業ページでは
          「言わずに終わった声」として別枠で表示し、沈黙率(SR)・窓口不達率(UR)として集計します。
        </p>
      </section>

      <section id="representative" className="space-y-2 scroll-mt-16">
        <h2 className="font-bold">代表レビューの選定方法</h2>
        <p>
          企業ページに常時公開する代表レビュー(1〜2件)は、
          <strong>納得度がその企業の全レビューの中央値に最も近いもの</strong>から順に自動選定します。
          運営が恣意的に高評価・低評価を選ぶことはありません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">対策バッジと解決済みバッジ</h2>
        <p>
          <strong>対策バッジは企業の自己申告</strong>です(80字以上・元の投稿とセットで公開・クレームソルブは内容を検証しません)。
          <strong>解決済みバッジは投稿者本人しか付けられません</strong>。企業が作成・編集・削除することはできず、
          両方が揃ったときにのみ「対策・解決済み」の完全バッジが表示されます。完全バッジは金銭では買えません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">担当者への申し出について</h2>
        <p>
          「担当者への申し出」は<strong>完全非公開</strong>で、公開ページ・検索のいずれにも表示されません。
          目的は<strong>個人の処罰ではなく、企業内の傾向把握</strong>です。担当者の個人名は記載できません
          (日時・チャネル・部署で企業側は確認できます)。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">レビューの削除について</h2>
        <p>
          レビューは金銭を含むいかなる手段でも削除できません。企業は「公開返信」や
          「対策バッジ」で対応できます。事実に誤りがある場合は異議申し立ての手続きがあります。
        </p>
      </section>
    </article>
  );
}
