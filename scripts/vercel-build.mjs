// Vercel ビルドの入口。DATABASE_URL で本番/デモを自動判別する。
// - 本番モード: DATABASE_URL が PostgreSQL → スキーマ適用 + 最小シード + next build
// - デモモード: それ以外 → シード済みSQLite(prod.db)を同梱してビルド(従来挙動)
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");

function run(cmd, extraEnv = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

function fail(msg) {
  console.error(`\n[本番ビルド中止] ${msg}`);
  process.exit(1);
}

if (isPostgres) {
  console.log("== 本番モード(PostgreSQL)でビルドします ==");

  // 公開前の必須env チェック(docs/production-launch.md 参照)
  const appUrl = process.env.APP_URL ?? "";
  if (!appUrl.startsWith("https://")) {
    fail("APP_URL に本番URL(https://〜)を設定してください。マジックリンクとOGPに使われます。");
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    fail("SESSION_SECRET(16文字以上のランダム文字列)を設定してください。セッションCookieの署名に使われます。");
  }
  if (!process.env.ADMIN_PASS || process.env.ADMIN_PASS === "claimsolve") {
    fail("ADMIN_PASS を初期値から変更してください(管理画面のパスワードです)。");
  }
  if (!process.env.MAIL_API_KEY) {
    fail("MAIL_API_KEY(Resend のAPIキー)を設定してください。未設定だとログインメールが誰にも届きません。");
  }

  run("node scripts/gen-pg-schema.mjs");
  run("npx prisma generate --schema prisma/schema.postgres.prisma");
  // 初回はテーブル作成、以降は差分適用(破壊的変更はここでは適用されず失敗する=安全側)
  run("npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate");
  run("npx tsx prisma/seed.production.ts");
  run("npx next build");
} else {
  console.log("== デモモード(同梱SQLite)でビルドします ==");
  run("npx prisma generate");
  run("npx prisma db push --force-reset --skip-generate", { DATABASE_URL: "file:./prod.db" });
  run("npm run seed", { DATABASE_URL: "file:./prod.db" });
  run("npx next build");
}
