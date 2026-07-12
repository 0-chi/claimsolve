# クレソル(ClaimSolve)

企業の「クレーム対応」を評価するレビューサイト。カスタマーサポートのOpenWork。
本リポジトリは要件定義書 **v2.4** に基づく MVP 実装です。

- **メイン=過去レビュー(past)**: 終了済みトラブルの対応を構造化評点でレビュー。企業参加ゼロで成立する集客・SEOエンジン。
- **サブ=ライブ案件(live)**: 進行中トラブルを企業に通知し、非公開スレッドで解決を目指す。**フル実装済みだが初期状態は非公開(`live_enabled=OFF`)**。

> ⚠️ 投入されるシードは**すべて架空のデモデータ**です(フッターに注記、本番投入時に削除)。

## 技術スタック

- Next.js 14(App Router)+ TypeScript
- Prisma + SQLite(開発。PostgreSQL 互換を維持)
- Tailwind CSS / next/og(OGP画像)/ Vitest(テスト)
- 認証: 自作トークン方式(消費者=マジックリンク、企業=メール+パスワード、admin=環境変数Basic認証)

## セットアップ

```bash
npm install
cp .env.example .env      # そのままでも全機能がモックで動作します
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3000
```

- `npm run db:reset` … DBを初期化して再シード
- `npm run test` … Vitest 実行
- `npm run build` … 本番ビルド

### APIキー無しで一気通貫

外部サービスはすべて **インターフェース + モック実装**。APIキーが1つも無くても、
`past投稿 → 自動公開 → 閲覧権付与`、`live投稿 → 通知 → 返答 → 評価 → スコア反映` の
両方がローカルで動作します。

## 主要な導線

| 画面 | パス | 備考 |
|---|---|---|
| トップ / 検索 | `/`, `/search` | スコア上位・改善余地・新着レビュー |
| 企業ページ | `/company/{法人番号}-{slug}` | スコアv2・期間タブ・代表レビュー・ゲート |
| 投稿 | `/post` | past統一フロー(liveは`live_enabled=ON`時のみ) |
| 投稿者専用ページ | `/m/{token}` | live:非公開スレッド・評価・異議対応(72h) |
| 個人閲覧プラン | `/plan/consumer` | `monetization_enabled=ON`時のみ販売 |
| 企業ポータル | `/company-portal` | 登録/ログイン/ダッシュボード |
| 運営管理 | `/admin` | Basic認証(`ADMIN_USER`/`ADMIN_PASS`) |

デモ用ログイン:
- 企業: `admin@subq.example.jp` / `password123`(法人番号 `9000000000000`)
- 消費者: `/login` で `user1@example.com`(開発時はリンクが画面に表示されます)
- live投稿者専用ページ: `/m/demo-magic-token-0001`

## フラグ(admin で切替)

| キー | 初期値 | 役割 |
|---|---|---|
| `gate_enabled` | OFF | 閲覧ゲート。公開レビュー総数 **>200 で自動ON**(admin上書き可) |
| `monetization_enabled` | OFF | 課金開始。個人閲覧プラン(150円)の表示・販売を制御 |
| `live_enabled` | **OFF** | ライブレーンの全導線。ONで即座に有効化 |

- ゲートとの独立: ゲートONでも課金開始前は全件閲覧の解放手段は「投稿」のみ。
- ゲートON以前に発行された ViewPass の有効期限は「ゲートON日から3ヶ月」に読み替えます。

## スコア(第7章)

- MA=納得度平均 / RS=解決到達率(no_action以外)/ IN=また使う率 / IR=ライブ返答率
- `AR = (IR×2 + MA×10×3 + RS×3 + IN×2) ÷ 100`(0〜10)
- IR計算不能時: `AR = (MA×10×3 + RS×3 + IN×2) ÷ 80`
- レビュー5件未満は「集計中」。集計対象は直近24ヶ月(全期間タブあり)。
- テスト: `src/lib/scoring.test.ts`, `gate.test.ts`, `unlock.test.ts`, `post-rules.test.ts`, `tests/past-flow.test.ts`

## 外部サービス差し替え表(第12章)

すべて `src/services/index.ts` および `src/lib/moderation.ts` に interface + モックを実装。
本番では env を設定し、各ファクトリ関数の実装を差し替えます。

| 機能 | インターフェース | モック挙動 | 本番候補 | env |
|---|---|---|---|---|
| SMS認証 | `SmsService` | コード `123456` 固定 | Twilio 等 | `SMS_API_KEY` |
| eKYC(任意) | `KycService` | 3秒後に自動承認 | TRUSTDOCK 等 | `KYC_API_KEY` |
| 決済 | `PaymentService` | 常に成功 | Stripe | `STRIPE_SECRET_KEY` |
| メール送信 | `MailService` | コンソール出力+`EmailLog` | Resend / SES | `MAIL_API_KEY` |
| 投稿審査 | `ModerationService` | 正規表現+辞書 | Claude API | `ANTHROPIC_API_KEY` |
| 法人マスタ | `CorporateRegistry` | シード100社検索 | 国税庁 法人番号Web-API | `HOJIN_APP_ID` |

### 本番差し替え手順(例)

1. 対象 env を `.env` に設定。
2. `src/services/index.ts` のファクトリ(例: `smsService`)で、キーが存在する場合に本番クラスを返すよう分岐。
3. `ModerationService` は `getModerationService()` に LLM 実装を追加。
4. DB を PostgreSQL に切替える場合は `prisma/schema.prisma` の `datasource` を変更(スキーマは互換)。

## 原価メモ / 送信ドメイン

- SMS 約10円/通、eKYC 数十〜百数十円/件、LLM審査 数円/件。
- メール送信は **通知用ドメインとマーケ用ドメインを分離**する方針。
- 送信ドメインは **SPF / DKIM / DMARC** 設定を前提とする。

## 支払い方法の方針(企業向け)

- 月額払いはクレジットカードのみ(セルフサーブ)。
- **銀行振込(請求書払い)は年払い限定**。与信・請求・回収は掛け払いサービスへ外部化し、
  MVPでは未実装。**企業からの要望が出た段階で追加**(適格請求書=インボイス対応、
  特商法表記の支払方法欄を更新)。

## モデレーション / BAN(第8章)

- severe(脅迫・個人情報晒し・なりすまし)= 即BAN。
- warn 3回でBAN。BAN時は全投稿を非公開化し、同一電話番号での再登録をブロック。
- pastは自動公開+事後モデレーション(通報 or ソフト警告2件以上で admin キュー)。

## ディレクトリ

```
src/
  app/            画面・APIルート(App Router)
  components/     UIコンポーネント
  lib/            スコア/ゲート/解禁/投稿/ライブ等のロジック(純関数中心・テスト対象)
  services/       外部サービスの interface + モック
prisma/
  schema.prisma   データモデル
  seed.ts         シード(企業6社/法人マスタ100社/pastレビュー30件/live案件8件)
tests/            統合テスト
```
