// 外部サービス差し替え表(第12章)。
// すべて「インターフェース + モック実装」。APIキーが1つも無くても
// 全機能がローカルで一気通貫に動作することが完成条件。

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// SMS認証(モック=コード123456固定 / 本番=Twilio等 / env: SMS_API_KEY)
// ---------------------------------------------------------------------------
export interface SmsService {
  sendCode(phone: string): Promise<{ sent: boolean }>;
  verify(phone: string, code: string): Promise<boolean>;
}

export const MOCK_SMS_CODE = "123456";

class MockSmsService implements SmsService {
  async sendCode(phone: string) {
    console.log(`[SMS mock] ${phone} 宛に認証コードを送信(固定: ${MOCK_SMS_CODE})`);
    return { sent: true };
  }
  async verify(_phone: string, code: string) {
    return code === MOCK_SMS_CODE;
  }
}

// 日本の電話番号を E.164(+81〜)に変換。
function toE164Jp(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+81${digits.slice(1)}`;
  return `+${digits}`;
}

// 本番: Twilio Verify(番号購入不要・従量課金)。
// env: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID
class TwilioVerifySmsService implements SmsService {
  private auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");
  private base = `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}`;

  private async post(path: string, params: Record<string, string>) {
    const res = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Twilio ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<{ status?: string }>;
  }

  async sendCode(phone: string) {
    try {
      await this.post("/Verifications", { To: toE164Jp(phone), Channel: "sms" });
      return { sent: true };
    } catch (e) {
      console.error("[SMS Twilio] 送信失敗:", e);
      return { sent: false };
    }
  }

  async verify(phone: string, code: string) {
    try {
      const j = await this.post("/VerificationCheck", { To: toE164Jp(phone), Code: code });
      return j.status === "approved";
    } catch (e) {
      console.error("[SMS Twilio] 検証失敗:", e);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// eKYC(任意機能・モック=3秒後に自動承認 / 本番=TRUSTDOCK等 / env: KYC_API_KEY)
// ---------------------------------------------------------------------------
export interface KycService {
  submit(userId: string, payload: { frontImage: string }): Promise<{ jobId: string }>;
  // マイナンバーカードは表面のみ。裏面は受け付けない(呼び出し側でブロック)。
}

class MockKycService implements KycService {
  async submit(userId: string) {
    const jobId = `kyc_${userId}_${Date.now()}`;
    // 3秒後に自動承認
    setTimeout(async () => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: "verified" },
        });
        console.log(`[KYC mock] user=${userId} を本人確認済みに更新`);
      } catch {
        /* テスト環境等では無視 */
      }
    }, 3000);
    return { jobId };
  }
}

// ---------------------------------------------------------------------------
// 決済(モック=常に成功 / 本番=Stripe / env: STRIPE_SECRET_KEY)
// ---------------------------------------------------------------------------
export interface PaymentService {
  registerCard(ref: string): Promise<{ ok: boolean; cardRegistered: boolean }>;
  charge(ref: string, amountYen: number): Promise<{ ok: boolean }>;
}

class MockPaymentService implements PaymentService {
  async registerCard(_ref: string) {
    return { ok: true, cardRegistered: true };
  }
  async charge(ref: string, amountYen: number) {
    console.log(`[Payment mock] ${ref} に ${amountYen}円を請求(常に成功)`);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// メール送信(モック=コンソール出力+EmailLog / 本番=Resend/SES / env: MAIL_API_KEY)
// ---------------------------------------------------------------------------
export interface MailService {
  send(input: {
    to: string;
    subject: string;
    body: string;
    purpose: string;
    status?: "queued" | "approved" | "sent";
  }): Promise<{ id: string }>;
}

// 本番: Resend(無料枠3,000通/月)。env: MAIL_API_KEY / MAIL_FROM
// 送信の成否に関わらず EmailLog に記録して admin から追跡できるようにする。
class ResendMailService implements MailService {
  async send(input: {
    to: string;
    subject: string;
    body: string;
    purpose: string;
    status?: "queued" | "approved" | "sent";
  }) {
    const from = process.env.MAIL_FROM || "ClaimSolve <onboarding@resend.dev>";
    let status = input.status ?? "sent";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MAIL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          text: input.body,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[Mail Resend] ${res.status}: ${text.slice(0, 300)}`);
        status = "queued"; // 失敗はqueuedとして記録(adminで確認可能)
      }
    } catch (e) {
      console.error("[Mail Resend] 送信失敗:", e);
      status = "queued";
    }
    const log = await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        purpose: input.purpose,
        status,
      },
    });
    return { id: log.id };
  }
}

class MockMailService implements MailService {
  async send(input: {
    to: string;
    subject: string;
    body: string;
    purpose: string;
    status?: "queued" | "approved" | "sent";
  }) {
    const status = input.status ?? "sent";
    console.log(
      `\n[Mail mock] to=${input.to} subject=${input.subject} status=${status}\n${input.body}\n`
    );
    const log = await prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        purpose: input.purpose,
        status,
      },
    });
    return { id: log.id };
  }
}

// ---------------------------------------------------------------------------
// 法人マスタ(モック=シード100社検索 / 本番=国税庁法人番号Web-API / env: HOJIN_APP_ID)
// ---------------------------------------------------------------------------
export interface CorporateRegistryResult {
  corporateNumber: string;
  name: string;
  address: string;
  category: string;
}

export interface CorporateRegistry {
  search(query: string): Promise<CorporateRegistryResult[]>;
}

class MockCorporateRegistry implements CorporateRegistry {
  async search(query: string) {
    const q = query.trim();
    if (!q) return [];
    // 前方一致 + 部分一致(法人番号でも名寄せ可)
    const rows = await prisma.corporateMaster.findMany({
      where: {
        OR: [{ name: { contains: q } }, { corporateNumber: { contains: q } }],
      },
      take: 20,
    });
    // 前方一致を優先
    rows.sort((a, b) => {
      const ap = a.name.startsWith(q) ? 0 : 1;
      const bp = b.name.startsWith(q) ? 0 : 1;
      return ap - bp;
    });
    return rows.map((r) => ({
      corporateNumber: r.corporateNumber,
      name: r.name,
      address: r.address,
      category: r.category,
    }));
  }
}

// ---------------------------------------------------------------------------
// 本番: 国税庁 法人番号システム Web-API(v4・無料)。env: HOJIN_APP_ID
// API結果は corporateMaster にキャッシュ書き込みする(write-through)。
// これにより投稿時の「マスタから昇格」フロー(post/silent/live/staff/企業登録)が
// 本番でも無改修で動く。
// ---------------------------------------------------------------------------

// ダブルクォート対応の簡易CSVパーサ(1行分)
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

class HojinBangouRegistry implements CorporateRegistry {
  private appId = process.env.HOJIN_APP_ID!;
  private db = new MockCorporateRegistry(); // 自DB(Company/corporateMaster)検索を併用

  private async fetchCsv(url: string): Promise<string[][]> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) {
        console.error(`[法人API] ${res.status}`);
        return [];
      }
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      // 1行目はヘッダ情報(件数等)なのでスキップ
      return lines.slice(1).map(parseCsvLine);
    } catch (e) {
      console.error("[法人API] 取得失敗:", e);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  // v4 CSVの列: [1]=法人番号 [6]=商号 [9]=都道府県 [10]=市区町村 [11]=丁目番地等
  private toResults(rows: string[][]): CorporateRegistryResult[] {
    return rows
      .filter((r) => r.length > 11 && /^\d{13}$/.test(r[1] ?? ""))
      .map((r) => ({
        corporateNumber: r[1],
        name: r[6] ?? "",
        address: `${r[9] ?? ""}${r[10] ?? ""}${r[11] ?? ""}`,
        category: "other",
      }))
      .filter((r) => r.name);
  }

  // 検索結果を法人マスタへキャッシュ(失敗しても検索自体は成功させる)
  private async cache(results: CorporateRegistryResult[]) {
    for (const r of results.slice(0, 20)) {
      try {
        await prisma.corporateMaster.upsert({
          where: { corporateNumber: r.corporateNumber },
          update: { name: r.name, address: r.address },
          create: r,
        });
      } catch {
        /* キャッシュ失敗は無視 */
      }
    }
  }

  async search(query: string) {
    const q = query.trim();
    if (!q) return [];
    const base = "https://api.houjin-bangou.nta.go.jp/4";
    const isNumber = /^\d{13}$/.test(q);
    const url = isNumber
      ? `${base}/num?id=${this.appId}&number=${q}&type=12&history=0`
      : `${base}/name?id=${this.appId}&name=${encodeURIComponent(q)}&type=12&mode=2&target=1&change=0&close=0`;

    const [apiRows, dbResults] = await Promise.all([this.fetchCsv(url), this.db.search(q)]);
    const apiResults = this.toResults(apiRows);
    await this.cache(apiResults);

    // 自DB(既存企業)を優先し、法人番号で重複排除
    const seen = new Set(dbResults.map((r) => r.corporateNumber));
    return [...dbResults, ...apiResults.filter((r) => !seen.has(r.corporateNumber))].slice(0, 20);
  }
}

// ---------------------------------------------------------------------------
// 本番でキー未設定の機能を安全に止めるための実装
// ---------------------------------------------------------------------------
class DisabledKycService implements KycService {
  async submit(): Promise<{ jobId: string }> {
    throw new Error("kyc_unavailable");
  }
}

class DisabledPaymentService implements PaymentService {
  async registerCard(): Promise<{ ok: boolean; cardRegistered: boolean }> {
    throw new Error("payment_unavailable");
  }
  async charge(): Promise<{ ok: boolean }> {
    throw new Error("payment_unavailable");
  }
}

// ---- ファクトリ(env にキーがあれば本番実装、無ければモック)------------------
// デモモード(SQLite)は常にモック。本番モード(PostgreSQL)ではキー未設定の
// 決済/KYCを「安全に失敗」させ、モックの成りすまし(常に成功)を防ぐ。
const isProdDb = (process.env.DATABASE_URL ?? "").startsWith("postgres");

const twilioConfigured =
  !!process.env.TWILIO_ACCOUNT_SID &&
  !!process.env.TWILIO_AUTH_TOKEN &&
  !!process.env.TWILIO_VERIFY_SERVICE_SID;

export const smsIsMock = !twilioConfigured;
// KYCは本番実装(TRUSTDOCK等)を導入するまで本番では停止(モックの自動承認は
// 「本人確認済み」バッジの偽造になるため)。デモでは従来どおりモックで動く。
export const kycAvailable = !isProdDb;

export const smsService: SmsService = twilioConfigured
  ? new TwilioVerifySmsService()
  : new MockSmsService();

export const kycService: KycService = kycAvailable
  ? new MockKycService()
  : new DisabledKycService();

export const paymentService: PaymentService =
  isProdDb && !process.env.STRIPE_SECRET_KEY
    ? new DisabledPaymentService()
    : new MockPaymentService(); // STRIPE_SECRET_KEY設定時の本番実装は課金開始時に差し替え

export const mailService: MailService = process.env.MAIL_API_KEY
  ? new ResendMailService()
  : new MockMailService();

export const corporateRegistry: CorporateRegistry = process.env.HOJIN_APP_ID
  ? new HojinBangouRegistry()
  : new MockCorporateRegistry();
