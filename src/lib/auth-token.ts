import { createHmac } from "node:crypto";

const SECRET = process.env.ADMIN_PASS || "claimsolve-dev-secret";

// 消費者マジックリンク用の署名トークン(DBテーブル不要の軽量方式)。
export function signMagic(userId: string, ttlMs = 72 * 60 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 24);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyMagic(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, exp, sig] = decoded.split(".");
    const payload = `${userId}.${exp}`;
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 24);
    if (sig !== expected) return null;
    if (Date.now() > parseInt(exp, 10)) return null;
    return userId;
  } catch {
    return null;
  }
}
