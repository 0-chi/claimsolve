// 実行モード判定。
// - 本番モード: DATABASE_URL が PostgreSQL(書き込みが永続する本物のDB)
// - デモモード: それ以外(同梱のシード済みSQLite。Vercel上では書き込みが揮発する)
// デモ注記の表示・モックのヒント表示・KYC可否などはこの判定に従う。

export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function isDemoMode(): boolean {
  return !isPostgres();
}
