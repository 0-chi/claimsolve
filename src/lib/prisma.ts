import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel などサーバーレス環境はファイルシステムが読み取り専用のため、
// 【デモモード】ではビルド時に同梱したシード済み SQLite(prisma/prod.db)を
// 書き込み可能な /tmp にコピーして使う(書き込みは揮発)。
// 【本番モード】(DATABASE_URL が PostgreSQL)ではそのまま本物のDBに接続する。
// ローカルは .env の DATABASE_URL をそのまま利用。
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return undefined;
  if (!process.env.VERCEL) return undefined;
  const tmpDb = "/tmp/dev.db";
  if (!fs.existsSync(tmpDb)) {
    const bundled = path.join(process.cwd(), "prisma", "prod.db");
    fs.copyFileSync(bundled, tmpDb);
  }
  return `file:${tmpDb}`;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
