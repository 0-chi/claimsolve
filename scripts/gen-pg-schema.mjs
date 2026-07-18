// prisma/schema.prisma(SQLite) から PostgreSQL 用スキーマを生成する。
// スキーマ本体は enum を使わない PostgreSQL 互換設計のため、
// datasource provider の差し替えだけで両対応になる(二重管理を避ける)。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "prisma", "schema.prisma");
const dst = path.join(root, "prisma", "schema.postgres.prisma");

const sqlite = readFileSync(src, "utf8");
if (!sqlite.includes('provider = "sqlite"')) {
  console.error("schema.prisma に provider = \"sqlite\" が見つかりません。");
  process.exit(1);
}
const pg =
  "// このファイルは scripts/gen-pg-schema.mjs が schema.prisma から自動生成します。直接編集しないでください。\n" +
  sqlite.replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync(dst, pg);
console.log(`generated: ${dst}`);
