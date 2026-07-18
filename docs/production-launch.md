# クレームソルブ 本番公開手順書

コード側の本番対応は済んでいます。**DATABASE_URL に PostgreSQL を設定するだけで、
ビルドと実行が自動的に「本番モード」に切り替わります**(デモデータ・デモ表記は出ません)。
この文書は「あなたがやること」を順番にまとめたものです。スマホだけで完結できます。

---

## モードの仕組み

| | デモモード(現在) | 本番モード |
|---|---|---|
| 切替条件 | DATABASE_URL が SQLite/未設定 | DATABASE_URL が `postgres://〜` |
| データ | 架空シード(書き込みは揮発) | 本物のDB(永続) |
| デモ注記・デモアカウント表記 | 表示 | 自動で非表示 |
| SMS認証 | コード123456固定 | Twilio Verify(設定時) |
| メール | コンソール出力 | Resend で実送信 |
| 法人検索 | シード100社 | 国税庁 法人番号Web-API(設定時) |
| 投稿審査 | 正規表現 | 正規表現+Claude API(設定時) |
| KYC(任意機能) | モック自動承認 | 停止(準備中表示)※実サービス導入まで |
| 決済 | モック | 停止 ※課金開始時にStripe導入 |

プレビュー(今のURL)は今後もデモモードのまま動き続けます。

---

## STEP 1: データベース(Neon・無料)

1. https://neon.tech → GitHubでサインアップ
2. 「New Project」→ Region: **Asia Pacific (Tokyo)** → Create
3. 表示される **接続文字列**(`postgresql://user:pass@〜/neondb?sslmode=require`)をコピー
   - 「Pooled connection」の方を選ぶ(サーバーレス向け)

## STEP 2: メール送信(Resend・無料枠3,000通/月)

1. https://resend.com → サインアップ
2. **API Keys** → Create API Key(`re_〜`)をコピー
3. ドメイン取得後: **Domains** → Add Domain → 表示されるDNSレコード(SPF/DKIM)を
   ドメイン側に登録 → 認証完了後、送信元を `noreply@あなたのドメイン` にできる
   - ドメイン認証前でもテスト送信は `onboarding@resend.dev` 名義で可能(本公開前に必ずドメイン認証)

## STEP 3: 独自ドメイン(年1,000〜2,000円)

1. Cloudflare Registrar / お名前.com などで取得(例: claimsolve.jp / .com)
2. Vercel → プロジェクト → **Settings → Domains** → ドメインを追加
3. 指示どおりDNSレコードを設定(自動でHTTPS化されます)

## STEP 4: Vercel 環境変数の設定

Vercel → プロジェクト → **Settings → Environment Variables** で以下を追加。
対象環境は **Production** にチェック(Preview には付けない=プレビューはデモのまま)。

### 必須(無いとビルドが止まる)

| 変数名 | 値 |
|---|---|
| `DATABASE_URL` | STEP 1 の接続文字列 |
| `APP_URL` | `https://あなたのドメイン` |
| `SESSION_SECRET` | ランダム32文字以上(パスワード生成アプリ等で作成) |
| `ADMIN_USER` / `ADMIN_PASS` | 管理画面のID/強いパスワード(初期値のままだと停止) |
| `MAIL_API_KEY` | STEP 2 の Resend キー |

### 強く推奨

| 変数名 | 値 | 用途 |
|---|---|---|
| `MAIL_FROM` | `ClaimSolve <noreply@ドメイン>` | 送信元表記 |
| `TWILIO_ACCOUNT_SID` `TWILIO_AUTH_TOKEN` `TWILIO_VERIFY_SERVICE_SID` | Twilio(下記) | SMS認証の実施 |
| `HOJIN_APP_ID` | 国税庁Web-API ID(下記) | 全法人の検索 |
| `ANTHROPIC_API_KEY` | Claude APIキー | 投稿審査の強化 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | お問い合わせ用メール | サポートページの「準備中」を解消 |

- **Twilio**: https://twilio.com → サインアップ → Verify → Service作成 → SID3点をコピー
  (Verifyは電話番号の購入不要。日本宛SMS 約10円/通の従量課金)
- **法人番号Web-API**: https://www.houjin-bangou.nta.go.jp/webapi/ から利用届出(無料)。
  IDの発行まで**1週間程度**かかるので早めに申請。届くまでは検索が「登録済み企業のみ」になるだけで、公開自体は可能
- **Claude API**: https://console.anthropic.com → APIキー発行。未設定でも正規表現審査で公開可能

### ⚠️ SMS認証の注意

Twilio 未設定のまま公開すると、認証コードが **123456 固定のモック**のまま
動きます(なりすまし・スパム投稿し放題)。**本公開までに必ず Twilio を設定**するか、
設定できるまで公開を控えてください。

## STEP 5: 法的ページ(公開前に必須)

- `/terms`(利用規約)と `/privacy`(プライバシーポリシー)は**プレースホルダ**です。
  レビューサイトは削除請求・発信者情報開示請求が構造的に発生するため、
  **弁護士のリーガルチェックを必ず**受けてください(目安5〜15万円のスポット依頼)
- `/tokushoho` は課金開始まで「非対象」の旨でも可
- LPの統計「年間およそ91万件(PIO-NET・2023年度)」を最新の公表値に更新
  (`src/app/page.tsx` — 国民生活センターの最新発表を確認)

## STEP 6: リリース(本番デプロイ)

1. GitHub の **PR #1 を main にマージ**(Vercel が main = Production を自動デプロイ)
2. ビルドログを確認 —「本番モード(PostgreSQL)でビルドします」と出ていれば成功
   - 必須envが足りない場合は日本語のエラーで止まります(安全装置)
3. `https://あなたのドメイン` を開いて確認:
   - [ ] フッターに「デモデータ」注記が**無い**
   - [ ] 企業0件の状態でトップが表示される(空状態は設計済み)
   - [ ] `/login` でメールを入れて**実際にメールが届く**
   - [ ] `/post` で検索→投稿→SMS認証(Twilio設定時は実SMS)
   - [ ] `/admin` が ADMIN_USER/ADMIN_PASS で開ける

## STEP 7: 公開後すぐ

- Google Search Console にドメイン登録 → `NEXT_PUBLIC_GSC_VERIFICATION` 設定 → sitemap.xml を送信
- 計測するなら GA4 作成 → `NEXT_PUBLIC_GA_ID` 設定(プライバシーポリシーの外部送信記載を更新)
- Neon のダッシュボードでバックアップ(Point-in-time restore)が有効なことを確認

---

## 費用まとめ(最小構成)

| 項目 | サービス | 月額 |
|---|---|---|
| ホスティング | Vercel Hobby | **0円** ※非商用の範囲。商用本格運用は Pro($20/月≈3,000円) |
| データベース | Neon Free | **0円**(0.5GB・十分) |
| メール | Resend Free | **0円**(3,000通/月まで) |
| 法人検索API | 国税庁 | **0円** |
| ドメイン | .com/.jp | **約100〜300円/月**(年払い1,000〜3,500円) |
| SMS認証 | Twilio Verify | **従量 約10円/認証**(月100投稿でも約1,000円) |
| 投稿審査 | Claude API | **従量 1〜3円/件**(任意) |
| **合計(スタート時)** | | **月 数百円〜1,500円程度** |

初期の固定費はほぼドメイン代だけ。伸びてきたら Vercel Pro / Neon 有料 / SES移行を検討。

### 別途(サービス外の費用)

- 弁護士による規約・プライバシーポリシー確認: **5〜15万円程度(1回)** — 公開前に強く推奨
- 商標(「クレームソルブ」)が気になる場合: 商標調査・出願は任意

---

## 運用メモ

- **スキーマ変更時**: `prisma/schema.prisma` を変更 → push すると本番ビルドで
  `prisma db push` が差分適用します。データが消える変更(列削除等)は安全のため
  ビルドが失敗します — その場合は Neon 側のバックアップを確認のうえ対応
- **企業向け機能の公開**: `src/lib/ui-flags.ts` の `SHOW_BUSINESS_ENTRY` を true に
- **閲覧ゲート再開**: `src/lib/flags.ts` の `GATE_AUTO_ACTIVATION` を true に
- **KYC / 決済**: 実サービス(TRUSTDOCK / Stripe)導入まで本番では安全に停止しています
