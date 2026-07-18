import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

// 新規ハッシュは bcrypt。シード由来の旧 sha256$ ハッシュも検証だけは通す
// (デモデータ互換。本番DBは最初から bcrypt のみ)。
export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

function legacySha256(pw: string): string {
  return "sha256$" + createHash("sha256").update(pw).digest("hex");
}

export function verifyPassword(pw: string, hash: string): boolean {
  if (hash.startsWith("sha256$")) return legacySha256(pw) === hash;
  try {
    return bcrypt.compareSync(pw, hash);
  } catch {
    return false;
  }
}

// フリーメール(企業ドメイン認証で不可)。
const FREE_MAIL_DOMAINS = [
  "gmail.com", "yahoo.co.jp", "yahoo.com", "outlook.com", "hotmail.com",
  "icloud.com", "live.jp", "ezweb.ne.jp", "docomo.ne.jp", "softbank.ne.jp",
];

export function isFreeMail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return FREE_MAIL_DOMAINS.includes(domain);
}
