import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitPastReview, PostError } from "@/lib/post";
import { maybeAutoActivateGate, getFlag, getGateActivatedAt, publicPostCount } from "@/lib/flags";

const CORP = "9000000000000";

async function makeCompany(corp: string, slug: string) {
  return prisma.company.create({
    data: { corporateNumber: corp, name: "テスト社" + slug, slug, address: "x", category: "subscription" },
  });
}

beforeAll(async () => {
  await prisma.featureFlag.createMany({
    data: [
      { key: "gate_enabled", value: false, updatedBy: "seed" },
      { key: "monetization_enabled", value: false, updatedBy: "seed" },
      { key: "live_enabled", value: false, updatedBy: "seed" },
    ],
  });
  await makeCompany(CORP, "test0");
});

const longBody = "あ".repeat(120);
const midBody = "い".repeat(60);

describe("past投稿 → 自動公開 → 閲覧権付与", () => {
  it("100字以上で公開され ViewPass が付与される", async () => {
    const res = await submitPastReview({
      corporateNumber: CORP,
      category: "subscription",
      title: "t",
      body: longBody,
      occurredYearMonth: "2026-03",
      review: { satisfaction: 8, outcome: "full_refund", wouldUseAgain: true },
      account: { displayName: "太郎", email: "taro@example.com", phone: "09000000001", code: "123456" },
    });
    expect(res.viewPassGranted).toBe(true);
    const c = await prisma.complaint.findUnique({ where: { id: res.complaintId } });
    expect(c?.status).toBe("published");
    const vp = await prisma.viewPass.count({ where: { userId: res.userId } });
    expect(vp).toBe(1);
  });

  it("50〜100字は公開されるが ViewPass は付与されない", async () => {
    const res = await submitPastReview({
      corporateNumber: CORP,
      category: "subscription",
      title: "t",
      body: midBody,
      occurredYearMonth: "2026-03",
      review: { satisfaction: 7, outcome: "partial_refund", wouldUseAgain: true },
      account: { displayName: "次郎", email: "jiro@example.com", phone: "09000000002", code: "123456" },
    });
    expect(res.viewPassGranted).toBe(false);
    const vp = await prisma.viewPass.count({ where: { userId: res.userId } });
    expect(vp).toBe(0);
  });

  it("50字未満は投稿できない", async () => {
    await expect(
      submitPastReview({
        corporateNumber: CORP,
        category: "subscription",
        title: "t",
        body: "あ".repeat(40),
        occurredYearMonth: "2026-03",
        review: { satisfaction: 7, outcome: "partial_refund", wouldUseAgain: true },
        account: { displayName: "短", email: "s@example.com", phone: "09000000003", code: "123456" },
      })
    ).rejects.toThrow(PostError);
  });

  it("同一企業への3件目はブロックされる", async () => {
    const acc = { displayName: "三郎", email: "sabu@example.com", phone: "09000000004", code: "123456" };
    for (let i = 0; i < 2; i++) {
      await submitPastReview({
        corporateNumber: CORP,
        category: "subscription",
        title: "t",
        body: longBody,
        occurredYearMonth: "2026-03",
        review: { satisfaction: 8, outcome: "full_refund", wouldUseAgain: true },
        account: acc,
      });
    }
    await expect(
      submitPastReview({
        corporateNumber: CORP,
        category: "subscription",
        title: "t",
        body: longBody,
        occurredYearMonth: "2026-03",
        review: { satisfaction: 8, outcome: "full_refund", wouldUseAgain: true },
        account: acc,
      })
    ).rejects.toThrowError(/2件/);
  });
});

describe("ゲートの200件自動発動", () => {
  it("200件ではOFF、201件目でON", async () => {
    const company = await makeCompany("9000000009999", "gateco");
    const user = await prisma.user.create({
      data: { displayName: "ゲート主", email: "gate@example.com", phone: "09099990000" },
    });
    // ゲート判定は公開投稿(past+silent+live)総数。既存分を差し引いて 200 まで積む。
    const pad = async (n: number) => {
      for (let i = 0; i < n; i++) {
        await prisma.complaint.create({
          data: {
            userId: user.id,
            companyId: company.id,
            lane: "past",
            category: "subscription",
            title: "x",
            body: "z",
            occurredYearMonth: "2026-01",
            status: "published",
            publishedAt: new Date(),
          },
        });
      }
    };
    const current = await publicPostCount();
    await pad(200 - current);
    expect(await publicPostCount()).toBe(200);
    await maybeAutoActivateGate();
    expect(await getFlag("gate_enabled")).toBe(false);

    // 201件目
    await pad(1);
    expect(await publicPostCount()).toBe(201);
    await maybeAutoActivateGate();
    expect(await getFlag("gate_enabled")).toBe(true);
    expect(await getGateActivatedAt()).not.toBeNull();

    // staff は公開投稿数に算入されない(ゲート判定外)
    const countBeforeStaff = await publicPostCount();
    await prisma.complaint.create({
      data: {
        userId: user.id,
        companyId: company.id,
        lane: "staff",
        category: "subscription",
        title: "staff",
        body: "z".repeat(80),
        department: "d",
        contactChannel: "phone",
        contactedAt: "2026-07-01 午前",
        status: "delivered",
      },
    });
    expect(await publicPostCount()).toBe(countBeforeStaff);
  });
});
