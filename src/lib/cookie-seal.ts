import { createHmac, timingSafeEqual } from "node:crypto";

// セッションCookieのHMAC署名。生IDをそのままCookieに載せない。
// SESSION_SECRET(本番必須) > ADMIN_PASS > 開発用固定値 の順で採用。
const SECRET =
  process.env.SESSION_SECRET || process.env.ADMIN_PASS || "claimsolve-dev-secret";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

export function sealCookie(id: string): string {
  return `${id}.${sign(id)}`;
}

// 署名付きCookieを検証してIDを返す。不正なら null。
export function openCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return id;
}
