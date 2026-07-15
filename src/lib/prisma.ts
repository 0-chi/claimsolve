import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel などサーバーレス環境はファイルシステムが読み取り専用のため、
// ビルド時に同梱したシード済み SQLite(prisma/prod.db)を書き込み可能な
// /tmp にコピーして使う。ローカルは .env の DATABASE_URL をそのまま利用。
function resolveDatabaseUrl(): string | undefined {
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
