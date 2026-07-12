import { createHash } from "node:crypto";

// MVP用の簡易ハッシュ(本番は bcrypt/argon2 に差し替え)。seed と同一方式。
export function hashPassword(pw: string): string {
  return "sha256$" + createHash("sha256").update(pw).digest("hex");
}

export function verifyPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
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
