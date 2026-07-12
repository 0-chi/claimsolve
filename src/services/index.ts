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

// ---- ファクトリ(env があれば本番実装に差し替える前提。今はモック固定)-------
export const smsService: SmsService = new MockSmsService();
export const kycService: KycService = new MockKycService();
export const paymentService: PaymentService = new MockPaymentService();
export const mailService: MailService = new MockMailService();
export const corporateRegistry: CorporateRegistry = new MockCorporateRegistry();
