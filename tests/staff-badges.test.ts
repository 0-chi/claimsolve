import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitStaffReport } from "@/lib/staff";
import { confirmResolution } from "@/lib/live";
import { publicPostCount } from "@/lib/flags";
import { getCompanyScore, getCompanySilentStats, getCompanyCr } from "@/lib/company-score";
import { PostError } from "@/lib/post";
import { randomBytes } from "node:crypto";

const CORP = "9100000000001";
let companyId = "";

const staffAccount = {
  displayName: "スタッフ申告者",
  email: "staffer@example.com",
  phone: "09088880001",
  code: "123456",
};
const longBody = (n: number) => "対".repeat(n);

beforeAll(async () => {
  const c = await prisma.company.create({
    data: {
      corporateNumber: CORP,
      name: "スタッフテスト社",
      slug: "stafftest",
      address: "x",
      category: "beauty",
    },
  });
  companyId = c.id;
});

describe("staff(担当者への申し出)の非公開性とスコア除外", () => {
  it("投稿できる(delivered)が、公開投稿数・AR・SRのいずれにも影響しない", async () => {
    const before = {
      posts: await publicPostCount(),
      silent: (await getCompanySilentStats(companyId)).total,
    };

    const res = await submitStaffReport({
      corporateNumber: CORP,
      category: "beauty",
      department: "テスト店",
      contactChannel: "phone",
      contactedAt: "2026-07-01 午前",
      staffIssues: ["high_handed"],
      body: longBody(90),
      account: staffAccount,
    });

    const c = await prisma.complaint.findUnique({ where: { id: res.complaintId } });
    expect(c?.lane).toBe("staff");
    expect(c?.status).toBe("delivered"); // published は存在しない

    // 公開投稿数(ゲート判定)に算入されない
    expect(await publicPostCount()).toBe(before.posts);
    // SR の分母にも入らない
    expect((await getCompanySilentStats(companyId)).total).toBe(before.silent);
    // Review が無いので AR は集計中のまま
    const score = await getCompanyScore(companyId);
    expect(score.recent.aggregating).toBe(true);

    // ViewPass は staff 由来・約24時間
    const vp = await prisma.viewPass.findFirst({
      where: { userId: res.userId, source: "staff" },
    });
    expect(vp).not.toBeNull();
    const hours = (vp!.expiresAt.getTime() - vp!.createdAt.getTime()) / 3600000;
    expect(Math.round(hours)).toBe(24);
  });

  it("本文80字未満・個人名入りは投稿できない", async () => {
    await expect(
      submitStaffReport({
        corporateNumber: CORP,
        category: "beauty",
        department: "テスト店",
        contactChannel: "phone",
        contactedAt: "2026-07-01 午前",
        body: longBody(79),
        account: { ...staffAccount, phone: "09088880002", displayName: "短文", email: "s2@example.com" },
      })
    ).rejects.toThrow(PostError);

    await expect(
      submitStaffReport({
        corporateNumber: CORP,
        category: "beauty",
        department: "テスト店",
        contactChannel: "phone",
        contactedAt: "2026-07-01 午前",
        body: longBody(40) + "担当の電話は090-1234-5678です。" + longBody(40),
        account: { ...staffAccount, phone: "09088880003", displayName: "個人情報", email: "s3@example.com" },
      })
    ).rejects.toThrowError(/個人名/);
  });

  it("同一企業・同一部署への3件目で admin キュー(Report)に入る", async () => {
    // 1件目は上のテストで投稿済み。2・3件目を別ユーザーで投稿
    for (let i = 0; i < 2; i++) {
      await submitStaffReport({
        corporateNumber: CORP,
        category: "beauty",
        department: "テスト店",
        contactChannel: "phone",
        contactedAt: "2026-07-01 午前",
        body: longBody(90),
        account: {
          displayName: `連投${i}`,
          email: `flood${i}@example.com`,
          phone: `0908888100${i}`,
          code: "123456",
        },
      });
    }
    const flood = await prisma.report.findFirst({
      where: { reason: { contains: "staff_flood" } },
    });
    expect(flood).not.toBeNull();
  });
});

describe("解決済みバッジは投稿者のみ・ARに影響しない", () => {
  async function makeLiveWithToken(replied: boolean, suffix: string) {
    const user = await prisma.user.create({
      data: {
        displayName: `解決主${suffix}`,
        email: `resolve${suffix}@example.com`,
        phone: `0907777${suffix.padStart(4, "0")}`,
      },
    });
    const complaint = await prisma.complaint.create({
      data: {
        userId: user.id,
        companyId,
        lane: "live",
        category: "beauty",
        title: "t",
        body: "b",
        status: replied ? "replied" : "published_awaiting",
        publishedAt: new Date(),
        notifiedAt: new Date(),
        firstReplyAt: replied ? new Date() : null,
      },
    });
    const token = randomBytes(12).toString("base64url");
    await prisma.magicToken.create({
      data: {
        userId: user.id,
        complaintId: complaint.id,
        token,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
      },
    });
    return { complaint, token };
  }

  it("liveは企業返信前は確定できず、返信後に投稿者が確定できる", async () => {
    const noReply = await makeLiveWithToken(false, "1");
    await expect(confirmResolution(noReply.token, {})).rejects.toThrowError(/返信/);

    const replied = await makeLiveWithToken(true, "2");
    const before = await getCompanyScore(companyId);
    const r = await confirmResolution(replied.token, {
      praisePoints: ["fast_response"],
      praiseComment: "早かったです",
    });
    expect(r.source).toBe("live_reply");
    const badge = await prisma.resolutionBadge.findUnique({
      where: { complaintId: replied.complaint.id },
    });
    expect(badge?.confirmedByUserId).toBe(replied.complaint.userId);

    // バッジは AR に影響しない(Review が増えないので集計値は不変)
    const after = await getCompanyScore(companyId);
    expect(after.recent.reviewCount).toBe(before.recent.reviewCount);
    expect(after.recent.ar).toBe(before.recent.ar);
  });

  it("pastは解決の申し出が accepted になるまで確定できない", async () => {
    const user = await prisma.user.create({
      data: { displayName: "過去主", email: "pastowner@example.com", phone: "09077770100" },
    });
    const complaint = await prisma.complaint.create({
      data: {
        userId: user.id,
        companyId,
        lane: "past",
        category: "beauty",
        title: "t",
        body: "b",
        occurredYearMonth: "2026-05",
        status: "published",
        publishedAt: new Date(),
      },
    });
    const token = randomBytes(12).toString("base64url");
    await prisma.magicToken.create({
      data: { userId: user.id, complaintId: complaint.id, token, expiresAt: new Date(Date.now() + 72 * 3600 * 1000) },
    });

    await expect(confirmResolution(token, {})).rejects.toThrowError(/申し出/);

    await prisma.resolutionOffer.create({
      data: { companyId, complaintId: complaint.id, body: "お".repeat(80), status: "accepted" },
    });
    const r = await confirmResolution(token, {});
    expect(r.source).toBe("past_offer");
  });
});

describe("CR(対策報告率)のDB算出", () => {
  it("納得度6以下のレビューが分母、公開対策バッジ付きが分子", async () => {
    const user = await prisma.user.create({
      data: { displayName: "CR主", email: "crowner@example.com", phone: "09077770200" },
    });
    // 改善余地(納得度5)レビュー×5、うち1件に対策バッジ
    let firstComplaintId = "";
    for (let i = 0; i < 5; i++) {
      const c = await prisma.complaint.create({
        data: {
          userId: user.id,
          companyId,
          lane: "past",
          category: "beauty",
          title: `cr${i}`,
          body: "b",
          occurredYearMonth: "2026-06",
          status: "published",
          publishedAt: new Date(),
        },
      });
      if (i === 0) firstComplaintId = c.id;
      await prisma.review.create({
        data: {
          complaintId: c.id,
          companyId,
          userId: user.id,
          satisfaction: 5,
          outcome: "apology_only",
          wouldUseAgain: false,
        },
      });
    }
    const note = await prisma.actionNote.create({
      data: { companyId, body: "改".repeat(100) },
    });
    await prisma.actionNoteComplaint.create({
      data: { noteId: note.id, complaintId: firstComplaintId },
    });
    // 取り消し済みバッジも1つ作る(分子に入らず、件数として併記される)
    await prisma.actionNote.create({
      data: { companyId, body: "取".repeat(100), status: "retracted", retractedAt: new Date() },
    });

    const cr = await getCompanyCr(companyId);
    expect(cr.lowReviewTotal).toBe(5);
    expect(cr.lowReviewWithAction).toBe(1);
    expect(cr.cr).toBe(20);
    expect(cr.retractedCount).toBe(1);
  });
});
