import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// 統合テスト用の使い捨て SQLite DB を用意する。
export default function setup() {
  // prisma は file: URL を schema ディレクトリ(prisma/)基準で解決するため
  // ./test.db は prisma/test.db を指す。
  const url = "file:./test.db";
  process.env.DATABASE_URL = url;
  try {
    rmSync("./prisma/test.db", { force: true });
  } catch {
    /* noop */
  }
  execSync("npx prisma db push --skip-generate --force-reset", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}
